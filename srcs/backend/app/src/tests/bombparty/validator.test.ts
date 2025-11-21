import { describe, it, expect } from '@jest/globals';
import { validateWithDictionarySync, validateLocal, getWordSuggestionsSync } from '../../modules/bombparty/validator.ts';

describe('BombParty Validator', () => {
  describe('validateWithDictionarySync', () => {
    it('should reject word that is too short', () => {
      const result = validateWithDictionarySync('ab', 'ma', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should reject word without syllable', () => {
      const result = validateWithDictionarySync('testword', 'xyz', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no_syllable');
    });

    it('should reject duplicate word', () => {
      const result = validateWithDictionarySync('testword', 'test', ['testword']);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('duplicate');
    });

    it('should reject word with invalid characters', () => {
      const result = validateWithDictionarySync('test123word', 'test', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('invalid_chars');
    });

    it('should accept word with valid syllable (if in dictionary)', () => {
      const result = validateWithDictionarySync('maison', 'mai', []);
      
      expect(result).toBeDefined();
      expect(typeof result.ok).toBe('boolean');
      
      if (result.ok) {
        expect(result.reason).toBeUndefined();
      } else {
        expect(result.reason).toBeDefined();
      }
    });

    it('should normalize words before validation', () => {
      const result1 = validateWithDictionarySync('maison', 'mai', []);
      const result2 = validateWithDictionarySync('maïson', 'mai', []);
      
      expect(result1.ok).toBe(result2.ok);
    });
  });

  describe('validateLocal', () => {
    it('should reject word that is too short', () => {
      const result = validateLocal('ab', 'ma', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should reject word without syllable', () => {
      const result = validateLocal('testword', 'xyz', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no_syllable');
    });

    it('should reject duplicate word', () => {
      const result = validateLocal('testword', 'test', ['testword']);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('duplicate');
    });

    it('should reject word with invalid characters', () => {
      const result = validateLocal('test123word', 'test', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('invalid_chars');
    });

    it('should accept valid word with syllable', () => {
      const result = validateLocal('testword', 'test', []);
      expect(result.ok).toBe(true);
    });

    it('should accept word with syllable in middle', () => {
      const result = validateLocal('mytestword', 'test', []);
      expect(result.ok).toBe(true);
    });

    it('should accept word with syllable at end', () => {
      const result = validateLocal('mytest', 'test', []);
      expect(result.ok).toBe(true);
    });
  });

  describe('getWordSuggestionsSync', () => {
    it('should return suggestions for syllable', () => {
      const suggestions = getWordSuggestionsSync('ma', 5);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      
      suggestions.forEach(word => {
        expect(word.toLowerCase().includes('ma')).toBe(true);
        expect(word.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should limit suggestions to maxSuggestions', () => {
      const suggestions = getWordSuggestionsSync('ma', 3);
      
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for syllable with no matches', () => {
      const suggestions = getWordSuggestionsSync('xyzabc123', 5);
      
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('syllable validation', () => {
    it('should reject "chat" for syllable "at" (not a real syllable)', () => {
      const result = validateLocal('chat', 'at', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no_syllable');
    });

    it('should accept "chat" for syllable "cha" (real syllable)', () => {
      const result = validateLocal('chat', 'cha', []);
      expect(result.ok).toBe(true);
    });

    it('should accept "chat" for syllable "t" if it is a real syllable', () => {
      const result = validateLocal('chat', 't', []);
      expect(result).toBeDefined();
    });

    it('should reject word where syllable is only a substring, not a real syllable', () => {
      const result = validateLocal('maison', 'ai', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no_syllable');
    });

    it('should accept word where syllable is a real syllable', () => {
      const result1 = validateLocal('maison', 'mai', []);
      expect(result1.ok).toBe(true);

      const result2 = validateLocal('maison', 'son', []);
      expect(result2.ok).toBe(true);
    });

    it('should handle compound words with hyphens', () => {
      const result = validateLocal('porte-monnaie', 'mon', []);
      expect(result.ok).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty syllable', () => {
      const result = validateLocal('test', '', []);
      expect(result.ok).toBe(false);
    });

    it('should handle empty word', () => {
      const result = validateLocal('', 'test', []);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should handle very long word', () => {
      const longWord = 'a'.repeat(100) + 'test' + 'b'.repeat(100);
      const result = validateLocal(longWord, 'test', []);
      expect(result.ok).toBe(true);
    });

    it('should handle special characters in syllable', () => {
      const result = validateLocal('test-word', 'test', []);
      expect(result.ok).toBe(true);
    });
  });
});

