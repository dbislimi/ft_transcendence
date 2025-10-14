/**
 * Schémas de validation pour les messages WebSocket Bomb Party
 * 
 * Valide les messages entrants/sortants selon les types définis
 */

import type { BonusKey } from './GameEngine.ts';

// Types de messages locaux
export interface BPClientMessage {
  event: string;
  payload: any;
}

export interface BPLobbyCreateMessage {
  event: 'bp:lobby:create';
  payload: {
    name: string;
    isPrivate: boolean;
    password?: string;
  };
}

export interface BPLobbyJoinMessage {
  event: 'bp:lobby:join';
  payload: {
    roomId: string;
    password?: string;
  };
}

export interface BPLobbyStartMessage {
  event: 'bp:lobby:start';
  payload: {
    roomId: string;
  };
}

export interface BPGameInputMessage {
  event: 'bp:game:input';
  payload: {
    roomId: string;
    word: string;
    msTaken: number;
  };
}

export interface BPBonusActivateMessage {
  event: 'bp:bonus:activate';
  payload: {
    roomId: string;
    bonusKey: BonusKey;
  };
}

/**
 * Résultat de validation
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  field?: string;
}

/**
 * Valide une chaîne de caractères
 */
function validateString(value: any, fieldName: string, minLength = 1, maxLength = 255): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { success: false, error: `${fieldName} doit être une chaîne`, field: fieldName };
  }
  
  if (value.length < minLength) {
    return { success: false, error: `${fieldName} trop court (min: ${minLength})`, field: fieldName };
  }
  
  if (value.length > maxLength) {
    return { success: false, error: `${fieldName} trop long (max: ${maxLength})`, field: fieldName };
  }
  
  return { success: true, data: value };
}

/**
 * Valide un booléen
 */
function validateBoolean(value: any, fieldName: string): ValidationResult<boolean> {
  if (typeof value !== 'boolean') {
    return { success: false, error: `${fieldName} doit être un booléen`, field: fieldName };
  }
  
  return { success: true, data: value };
}

/**
 * Valide un nombre
 */
function validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationResult<number> {
  if (typeof value !== 'number' || isNaN(value)) {
    return { success: false, error: `${fieldName} doit être un nombre`, field: fieldName };
  }
  
  if (min !== undefined && value < min) {
    return { success: false, error: `${fieldName} trop petit (min: ${min})`, field: fieldName };
  }
  
  if (max !== undefined && value > max) {
    return { success: false, error: `${fieldName} trop grand (max: ${max})`, field: fieldName };
  }
  
  return { success: true, data: value };
}

/**
 * Valide une clé de bonus
 */
function validateBonusKey(value: any, fieldName: string): ValidationResult<BonusKey> {
  const validKeys: BonusKey[] = ['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'];
  
  if (!validKeys.includes(value)) {
    return { 
      success: false, 
      error: `${fieldName} invalide (valeurs: ${validKeys.join(', ')})`, 
      field: fieldName 
    };
  }
  
  return { success: true, data: value };
}

/**
 * Valide le message de création de lobby
 */
export function validateLobbyCreateMessage(payload: any): ValidationResult<BPLobbyCreateMessage['payload']> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload manquant ou invalide' };
  }

  const nameResult = validateString(payload.name, 'name', 1, 50);
  if (!nameResult.success) return nameResult;

  const isPrivateResult = validateBoolean(payload.isPrivate, 'isPrivate');
  if (!isPrivateResult.success) return isPrivateResult;

  let password: string | undefined;
  if (payload.password !== undefined) {
    const passwordResult = validateString(payload.password, 'password', 1, 100);
    if (!passwordResult.success) return passwordResult;
    password = passwordResult.data;
  }

  let maxPlayers = 6;
  if (payload.maxPlayers !== undefined) {
    const maxPlayersResult = validateNumber(payload.maxPlayers, 'maxPlayers', 2, 8);
    if (!maxPlayersResult.success) return maxPlayersResult;
    maxPlayers = maxPlayersResult.data;
  }

  return {
    success: true,
    data: {
      name: nameResult.data!,
      isPrivate: isPrivateResult.data!,
      password,
      maxPlayers
    }
  };
}

/**
 * Valide le message de rejoindre un lobby
 */
export function validateLobbyJoinMessage(payload: any): ValidationResult<BPLobbyJoinMessage['payload']> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload manquant ou invalide' };
  }

  const roomIdResult = validateString(payload.roomId, 'roomId', 1, 100);
  if (!roomIdResult.success) return roomIdResult;

  let password: string | undefined;
  if (payload.password !== undefined) {
    const passwordResult = validateString(payload.password, 'password', 1, 100);
    if (!passwordResult.success) return passwordResult;
    password = passwordResult.data;
  }

  return {
    success: true,
    data: {
      roomId: roomIdResult.data!,
      password
    }
  };
}

/**
 * Valide le message de démarrage de lobby
 */
export function validateLobbyStartMessage(payload: any): ValidationResult<BPLobbyStartMessage['payload']> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload manquant ou invalide' };
  }

  const roomIdResult = validateString(payload.roomId, 'roomId', 1, 100);
  if (!roomIdResult.success) return roomIdResult;

  return {
    success: true,
    data: {
      roomId: roomIdResult.data!
    }
  };
}

/**
 * Valide le message d'entrée de jeu
 */
export function validateGameInputMessage(payload: any): ValidationResult<BPGameInputMessage['payload']> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload manquant ou invalide' };
  }

  const roomIdResult = validateString(payload.roomId, 'roomId', 1, 100);
  if (!roomIdResult.success) return roomIdResult;

  const wordResult = validateString(payload.word, 'word', 1, 50);
  if (!wordResult.success) return wordResult;

  const msTakenResult = validateNumber(payload.msTaken, 'msTaken', 0, 60000);
  if (!msTakenResult.success) return msTakenResult;

  return {
    success: true,
    data: {
      roomId: roomIdResult.data!,
      word: wordResult.data!,
      msTaken: msTakenResult.data!
    }
  };
}

/**
 * Valide le message d'activation de bonus
 */
export function validateBonusActivateMessage(payload: any): ValidationResult<BPBonusActivateMessage['payload']> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload manquant ou invalide' };
  }

  const roomIdResult = validateString(payload.roomId, 'roomId', 1, 100);
  if (!roomIdResult.success) return roomIdResult;

  const bonusKeyResult = validateBonusKey(payload.bonusKey, 'bonusKey');
  if (!bonusKeyResult.success) return bonusKeyResult;

  return {
    success: true,
    data: {
      roomId: roomIdResult.data!,
      bonusKey: bonusKeyResult.data!
    }
  };
}

/**
 * Valide un message client générique
 */
export function validateClientMessage(message: any): ValidationResult<BPClientMessage> {
  if (!message || typeof message !== 'object') {
    return { success: false, error: 'Message invalide' };
  }

  if (typeof message.event !== 'string') {
    return { success: false, error: 'Event manquant ou invalide', field: 'event' };
  }

  switch (message.event) {
    case 'bp:lobby:create': {
      const payloadResult = validateLobbyCreateMessage(message.payload);
      if (!payloadResult.success) return payloadResult;
      
      return {
        success: true,
        data: {
          event: 'bp:lobby:create',
          payload: payloadResult.data!
        }
      };
    }

    case 'bp:lobby:join': {
      const payloadResult = validateLobbyJoinMessage(message.payload);
      if (!payloadResult.success) return payloadResult;
      
      return {
        success: true,
        data: {
          event: 'bp:lobby:join',
          payload: payloadResult.data!
        }
      };
    }

    case 'bp:lobby:start': {
      const payloadResult = validateLobbyStartMessage(message.payload);
      if (!payloadResult.success) return payloadResult;
      
      return {
        success: true,
        data: {
          event: 'bp:lobby:start',
          payload: payloadResult.data!
        }
      };
    }

    case 'bp:game:input': {
      const payloadResult = validateGameInputMessage(message.payload);
      if (!payloadResult.success) return payloadResult;
      
      return {
        success: true,
        data: {
          event: 'bp:game:input',
          payload: payloadResult.data!
        }
      };
    }

    case 'bp:bonus:activate': {
      const payloadResult = validateBonusActivateMessage(message.payload);
      if (!payloadResult.success) return payloadResult;
      
      return {
        success: true,
        data: {
          event: 'bp:bonus:activate',
          payload: payloadResult.data!
        }
      };
    }

    default:
      return { 
        success: false, 
        error: `Event non supporté: ${message.event}`, 
        field: 'event' 
      };
  }
}

/**
 * Sanitise une chaîne pour éviter les injections
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // Supprimer les balises HTML basiques
    .substring(0, 255); // Limiter la longueur
}

/**
 * Valide et sanitise un nom de joueur
 */
export function validatePlayerName(name: any): ValidationResult<string> {
  const nameResult = validateString(name, 'name', 1, 30);
  if (!nameResult.success) return nameResult;

  const sanitized = sanitizeString(nameResult.data!);
  if (sanitized.length === 0) {
    return { success: false, error: 'Nom invalide après nettoyage', field: 'name' };
  }

  return { success: true, data: sanitized };
}
