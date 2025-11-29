/**
 * BombParty API Service
 * Handles HTTP API calls to the backend for game logic (validation, syllables, suggestions)
 * This is separate from bombPartyService.ts which handles WebSocket multiplayer functionality
 */

const API_BASE_URL = '/api/bomb-party';

interface ValidationResult {
    ok: boolean;
    reason?: string;
}

interface SyllableData {
    syllable: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface SyllableInfo {
    syllable: string;
    availableWords: number;
    totalWords: number;
    difficulty: string;
}

export class BombPartyApiService {
    /**
     * Helper to get headers with auth token
     */
    private getHeaders(): HeadersInit {
        const token = sessionStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    /**
     * Validate a word against the backend dictionary
     */
    async validateWord(
        word: string,
        syllable: string,
        usedWords: string[]
    ): Promise<ValidationResult> {
        try {
            const response = await fetch(`${API_BASE_URL}/validate-word`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ word, syllable, usedWords }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data as ValidationResult;
        } catch (error) {
            console.error('[BombPartyAPI] Error validating word:', error);
            throw error;
        }
    }

    /**
     * Get a random syllable from the backend
     */
    async getRandomSyllable(excludeSyllable?: string): Promise<SyllableData> {
        try {
            const url = new URL(`${API_BASE_URL}/syllable/random`, window.location.origin);
            if (excludeSyllable) {
                url.searchParams.append('exclude', excludeSyllable);
            }

            const response = await fetch(url.toString(), {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data as SyllableData;
        } catch (error) {
            console.error('[BombPartyAPI] Error getting random syllable:', error);
            throw error;
        }
    }

    /**
     * Get information about a specific syllable
     */
    async getSyllableInfo(syllable: string): Promise<SyllableInfo> {
        try {
            const response = await fetch(`${API_BASE_URL}/syllable/info/${encodeURIComponent(syllable)}`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data as SyllableInfo;
        } catch (error) {
            console.error('[BombPartyAPI] Error getting syllable info:', error);
            throw error;
        }
    }

    /**
     * Get word suggestions for a syllable
     */
    async getWordSuggestions(syllable: string, max: number = 5): Promise<string[]> {
        try {
            const url = new URL(`${API_BASE_URL}/suggestions`, window.location.origin);
            url.searchParams.append('syllable', syllable);
            url.searchParams.append('max', max.toString());

            const response = await fetch(url.toString(), {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data.suggestions as string[];
        } catch (error) {
            console.error('[BombPartyAPI] Error getting word suggestions:', error);
            return [];
        }
    }
}

// Export singleton instance
export const bombPartyApiService = new BombPartyApiService();
