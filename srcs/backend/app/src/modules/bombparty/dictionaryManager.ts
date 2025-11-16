import fs from 'fs';
import { normalizeText, isValidSyllableInWord } from './syllableExtractor.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARTITION_SIZE = 10000;
const CACHE_SIZE = 5;
const CACHE_TTL = 5 * 60 * 1000;

interface PartitionCache {
  words: Set<string>;
  lastAccessed: number;
}

// lazy loading des partitions pour eviter de charger tout le dico en memoire
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

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.partitionsDir) || this.getPartitionFiles().length === 0) {
      console.log('[DictionaryManager] Création des partitions...');
      await this.createPartitions();
    } else {
      this.partitionFiles = this.getPartitionFiles();
      this.partitionCount = this.partitionFiles.length;
    }

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

  // cache LRU: garde max 5 partitions en memoire
  private async loadPartition(partitionIndex: number): Promise<Set<string>> {
    const cached = this.partitions.get(partitionIndex);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.words;
    }

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

    this.partitions.set(partitionIndex, {
      words,
      lastAccessed: Date.now()
    });

    this.cleanupCache();

    return words;
  }

  // garde seulement les CACHE_SIZE partitions les plus recentes
  private cleanupCache(): void {
    if (this.partitions.size <= CACHE_SIZE) return;

    const sorted = Array.from(this.partitions.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = sorted.slice(0, this.partitions.size - CACHE_SIZE);
    for (const [index] of toRemove) {
      this.partitions.delete(index);
    }
  }

  // pour l'instant on cherche dans toutes les partitions (pas de tri par syllabe)
  private findPartitionForWord(word: string): number[] {
    return Array.from({ length: this.partitionCount }, (_, i) => i);
  }

  async wordExists(word: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedWord = normalizeText(word);
    const partitionIndices = this.findPartitionForWord(normalizedWord);

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

  async getWordSuggestions(syllable: string, maxSuggestions: number = 5): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedSyllable = normalizeText(syllable);
    const suggestions: string[] = [];

    for (let i = 0; i < this.partitionCount && suggestions.length < maxSuggestions; i++) {
      try {
        const partition = await this.loadPartition(i);
        for (const word of partition) {
          if (word.length >= 3 && isValidSyllableInWord(word, normalizedSyllable)) {
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

  getTotalWords(): number {
    return this.totalWords;
  }

  getPartitionCount(): number {
    return this.partitionCount;
  }

  getCacheStats(): { size: number; maxSize: number; partitions: number[] } {
    return {
      size: this.partitions.size,
      maxSize: CACHE_SIZE,
      partitions: Array.from(this.partitions.keys())
    };
  }
}

let dictionaryManagerInstance: DictionaryManager | null = null;

export function getDictionaryManager(): DictionaryManager {
  if (!dictionaryManagerInstance) {
    dictionaryManagerInstance = new DictionaryManager();
  }
  return dictionaryManagerInstance;
}
