import type { Room, PlayerConnection } from './room/roomTypes.ts';
import { normalizeText } from './syllableExtractor.ts';
import { validateWithDictionary } from './validator.ts';
import type { GameState } from './types.ts';

export function sanitizePlayerName(name: string): string {
  let sanitized = name.trim();
  
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }
  
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g, '');
  
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized;
}

export function sanitizeWord(word: string): string {
  let sanitized = word.trim();
  
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  sanitized = normalizeText(sanitized);
  
  return sanitized;
}

export function validatePlayerId(playerId: any): boolean {
  if (typeof playerId !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(playerId);
}

export function validateRoomId(roomId: any): boolean {
  if (typeof roomId !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(roomId);
}

export function validateMsTaken(
  msTaken: any, 
  turnStartedAt: number, 
  turnDurationMs: number,
  playerId?: string,
  roomId?: string
): { valid: boolean; corrected?: number; reason?: string } {
  if (typeof msTaken !== 'number' || isNaN(msTaken)) {
    return { 
      valid: false, 
      reason: `Invalid msTaken type: ${typeof msTaken}, value: ${msTaken}` 
    };
  }
  
  if (msTaken < 0) {
    return { 
      valid: false, 
      reason: `msTaken is negative: ${msTaken}` 
    };
  }
  
  if (!turnStartedAt || turnStartedAt <= 0) {
    return { 
      valid: false, 
      reason: `Invalid turnStartedAt: ${turnStartedAt}` 
    };
  }
  
  const now = Date.now();
  const realMsTaken = now - turnStartedAt;
  
  const maxMsTaken = turnDurationMs + 500;
  
  if (msTaken > maxMsTaken) {
    return { 
      valid: false, 
      reason: `msTaken (${msTaken}ms) exceeds maximum allowed (${maxMsTaken}ms). Real time: ${realMsTaken}ms` 
    };
  }
  
  const diff = Math.abs(msTaken - realMsTaken);
  if (diff > 1000) {
    return { 
      valid: false, 
      reason: `msTaken (${msTaken}ms) differs too much from real time (${realMsTaken}ms). Difference: ${diff}ms` 
    };
  }
  
  if (diff > 500) {
    return { 
      valid: true, 
      corrected: Math.min(realMsTaken, turnDurationMs),
      reason: `msTaken corrected: ${msTaken}ms -> ${Math.min(realMsTaken, turnDurationMs)}ms (diff: ${diff}ms)`
    };
  }
  
  return { 
    valid: true, 
    corrected: Math.min(msTaken, turnDurationMs) 
  };
}

export function isHost(room: Room, playerId: string): boolean {
  if (!room.hostId) {
    const firstPlayer = Array.from(room.players.keys())[0];
    return firstPlayer === playerId;
  }
  
  return room.hostId === playerId;
}

export function isPlayerInRoom(room: Room, playerId: string): boolean {
  return room.players.has(playerId);
}

export function isCurrentPlayer(state: GameState, playerId: string): boolean {
  return (state as any).currentPlayerId === playerId;
}

export async function validateWordServerSide(
  word: string,
  syllable: string,
  usedWords: string[]
): Promise<{ ok: boolean; reason?: string }> {
  const sanitized = sanitizeWord(word);
  
  if (sanitized.length < 3) {
    return { ok: false, reason: 'too_short' };
  }
  
  const validation = await validateWithDictionary(sanitized, syllable, usedWords);
  
  return validation;
}

export function canActivateBonus(
  state: GameState,
  playerId: string,
  bonusKey: string
): { allowed: boolean; reason?: string } {
  const player = (state as any).players.find((p: any) => p.id === playerId);
  
  if (!player) {
    return { allowed: false, reason: 'Player not found' };
  }
  
  if (player.isEliminated) {
    return { allowed: false, reason: 'Player is eliminated' };
  }
  
  const bonusCount = player.bonuses[bonusKey as keyof typeof player.bonuses] || 0;
  if (bonusCount <= 0) {
    return { allowed: false, reason: 'No bonus available' };
  }
  
  return { allowed: true };
}

