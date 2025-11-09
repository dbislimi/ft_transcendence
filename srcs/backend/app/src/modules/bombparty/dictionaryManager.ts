import fs from 'fs';
import { normalizeText } from './syllableExtractor.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du lazy loading
const PARTITION_SIZE = 10000; // Nombre de mots par partition
const CACHE_SIZE = 5; // Nombre de partitions à garder en cache
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en millisecondes

interface PartitionCache {
  words: Set<string>;
  lastAccessed: number;
}

/**
 * Gestionnaire de dictionnaire avec lazy loading et partition
 * Charge uniquement les partitions nécessaires en mémoire
 */
export class DictionaryManager {
  private partitions: Map<number, PartitionCache> = new Map();
  private totalWords: number = 0;
  private partitionCount: number = 0;
  private partitionFiles: string[] = [];
  private allWordsPath: string;
  private partitionsDir: string;
  private initialized: boolean = false;

  constructor() {
    this.allWordsPath = path.join(__dirname, 'data', 'francais.txt');
    this.partitionsDir = path.join(__dirname, 'data', 'partitions');
    this.ensurePartitionsDir();
  }

  /**
   * Initialise le gestionnaire de dictionnaire
   * Vérifie si les partitions existent, sinon les crée
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Vérifie si les partitions existent
    if (!fs.existsSync(this.partitionsDir) || this.getPartitionFiles().length === 0) {
      console.log('[DictionaryManager] Création des partitions...');
      await this.createPartitions();
    } else {
      this.partitionFiles = this.getPartitionFiles();
      this.partitionCount = this.partitionFiles.length;
    }

    // Charge le nombre total de mots
    const allWords = fs.readFileSync(this.allWordsPath, 'utf8');
    this.totalWords = allWords.split('\n').filter(line => line.trim().length > 0).length;

    this.initialized = true;
    console.log(`[DictionaryManager] Initialisé: ${this.totalWords} mots, ${this.partitionCount} partitions`);
  }

  private ensurePartitionsDir(): void {
    if (!fs.existsSync(this.partitionsDir)) {
      fs.mkdirSync(this.partitionsDir, { recursive: true });
    }
  }

  private getPartitionFiles(): string[] {
    if (!fs.existsSync(this.partitionsDir)) {
      return [];
    }
    return fs.readdirSync(this.partitionsDir)
      .filter(file => file.startsWith('partition_') && file.endsWith('.txt'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)![0]);
        const numB = parseInt(b.match(/\d+/)![0]);
        return numA - numB;
      })
      .map(file => path.join(this.partitionsDir, file));
  }

  /**
   * Crée les partitions du dictionnaire
   */
  private async createPartitions(): Promise<void> {
    const allWords = fs.readFileSync(this.allWordsPath, 'utf8');
    const words = allWords
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(word => normalizeText(word));

    let partitionIndex = 0;
    let currentPartition: string[] = [];

    for (const word of words) {
      currentPartition.push(word);

      if (currentPartition.length >= PARTITION_SIZE) {
        await this.savePartition(partitionIndex, currentPartition);
        partitionIndex++;
        currentPartition = [];
      }
    }

    // Sauvegarde la dernière partition si elle n'est pas vide
    if (currentPartition.length > 0) {
      await this.savePartition(partitionIndex, currentPartition);
      partitionIndex++;
    }

    this.partitionCount = partitionIndex;
    this.partitionFiles = this.getPartitionFiles();
    console.log(`[DictionaryManager] ${this.partitionCount} partitions créées`);
  }

  private async savePartition(index: number, words: string[]): Promise<void> {
    const partitionPath = path.join(this.partitionsDir, `partition_${index}.txt`);
    fs.writeFileSync(partitionPath, words.join('\n'), 'utf8');
  }

  /**
   * Charge une partition en mémoire (avec cache LRU)
   */
  private async loadPartition(partitionIndex: number): Promise<Set<string>> {
    // Vérifie le cache
    const cached = this.partitions.get(partitionIndex);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.words;
    }

    // Charge depuis le disque
    const partitionPath = path.join(this.partitionsDir, `partition_${partitionIndex}.txt`);
    if (!fs.existsSync(partitionPath)) {
      throw new Error(`Partition ${partitionIndex} not found`);
    }

    const wordsData = fs.readFileSync(partitionPath, 'utf8');
    const words = new Set(
      wordsData
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    );

    // Ajoute au cache
    this.partitions.set(partitionIndex, {
      words,
      lastAccessed: Date.now()
    });

    // Nettoie le cache si nécessaire (LRU)
    this.cleanupCache();

    return words;
  }

  /**
   * Nettoie le cache en gardant seulement les partitions les plus récemment utilisées
   */
  private cleanupCache(): void {
    if (this.partitions.size <= CACHE_SIZE) return;

    // Trie par dernière utilisation et supprime les plus anciennes
    const sorted = Array.from(this.partitions.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = sorted.slice(0, this.partitions.size - CACHE_SIZE);
    for (const [index] of toRemove) {
      this.partitions.delete(index);
    }
  }

  /**
   * Trouve la partition qui pourrait contenir un mot
   * Utilise une recherche binaire approximative
   */
  private findPartitionForWord(word: string): number[] {
    // Pour l'instant, on cherche dans toutes les partitions
    // Une optimisation future pourrait utiliser un index par préfixe
    return Array.from({ length: this.partitionCount }, (_, i) => i);
  }

  /**
   * Vérifie si un mot existe dans le dictionnaire
   */
  async wordExists(word: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedWord = normalizeText(word);
    const partitionIndices = this.findPartitionForWord(normalizedWord);

    // Recherche dans les partitions pertinentes
    for (const partitionIndex of partitionIndices) {
      try {
        const partition = await this.loadPartition(partitionIndex);
        if (partition.has(normalizedWord)) {
          return true;
        }
      } catch (error) {
        console.error(`[DictionaryManager] Erreur lors du chargement de la partition ${partitionIndex}:`, error);
      }
    }

    return false;
  }

  /**
   * Obtient des suggestions de mots pour une syllabe
   */
  async getWordSuggestions(syllable: string, maxSuggestions: number = 5): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedSyllable = normalizeText(syllable);
    const suggestions: string[] = [];

    // Recherche dans toutes les partitions
    for (let i = 0; i < this.partitionCount && suggestions.length < maxSuggestions; i++) {
      try {
        const partition = await this.loadPartition(i);
        for (const word of partition) {
          if (word.includes(normalizedSyllable) && word.length >= 3) {
            suggestions.push(word);
            if (suggestions.length >= maxSuggestions) break;
          }
        }
      } catch (error) {
        console.error(`[DictionaryManager] Erreur lors de la recherche dans la partition ${i}:`, error);
      }
    }

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Obtient le nombre total de mots
   */
  getTotalWords(): number {
    return this.totalWords;
  }

  /**
   * Obtient le nombre de partitions
   */
  getPartitionCount(): number {
    return this.partitionCount;
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats(): { size: number; maxSize: number; partitions: number[] } {
    return {
      size: this.partitions.size,
      maxSize: CACHE_SIZE,
      partitions: Array.from(this.partitions.keys())
    };
  }
}

// Instance singleton
let dictionaryManagerInstance: DictionaryManager | null = null;

/**
 * Obtient l'instance singleton du gestionnaire de dictionnaire
 */
export function getDictionaryManager(): DictionaryManager {
  if (!dictionaryManagerInstance) {
    dictionaryManagerInstance = new DictionaryManager();
  }
  return dictionaryManagerInstance;
}

