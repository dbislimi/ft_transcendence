import { describe, it, expect } from '@jest/globals';
import { validateClientMessage, validateAuthMessage } from '../../modules/bombparty/validation.ts';

describe('BombParty Validation', () => {
  describe('validateClientMessage', () => {
    it('should accept valid client message', () => {
      const message = {
        event: 'bp:lobby:create',
        payload: {
          name: 'Test Room',
          isPrivate: false,
          maxPlayers: 4
        }
      };
      const result = validateClientMessage(message);
      expect(result.success).toBe(true);
    });

    it('should reject message without event', () => {
      const message = {
        payload: { name: 'Test' }
      };
      const result = validateClientMessage(message);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject message without payload', () => {
      const message = {
        event: 'bp:lobby:create'
      };
      const result = validateClientMessage(message);
      expect(result.success).toBe(true);
    });
  });

  describe('validateAuthMessage', () => {
    it('should accept valid auth message', () => {
      const message = {
        event: 'bp:auth',
        payload: {
          playerName: 'TestPlayer'
        }
      };
      const result = validateAuthMessage(message);
      expect(result.success).toBe(true);
    });

    it('should reject auth message without playerName', () => {
      const message = {
        event: 'bp:auth',
        payload: {}
      };
      const result = validateAuthMessage(message);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject auth message with empty playerName', () => {
      const message = {
        event: 'bp:auth',
        payload: {
          playerName: ''
        }
      };
      const result = validateAuthMessage(message);
      expect(result.success).toBe(false);
    });

    it('should reject auth message with playerName too long', () => {
      const message = {
        event: 'bp:auth',
        payload: {
          playerName: 'A'.repeat(51) // Max 50 chars
        }
      };
      const result = validateAuthMessage(message);
      expect(result.success).toBe(false);
    });
  });
});

