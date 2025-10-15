import { z } from 'zod';
import type { ErrorCode } from './types.ts';
import { 
  clientMessageSchema,
  authMessageSchema,
  lobbyCreateSchema,
  lobbyJoinSchema,
  lobbyLeaveSchema,
  lobbyStartSchema,
  gameInputSchema,
  bonusActivateSchema,
  playerNameSchema
} from './schemas.ts';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
}

function validateWithZod<T>(schema: z.ZodSchema<T>, data: any): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.issues.map(e => e.message).join(', '),
        code: 'VALIDATION_ERROR' as ErrorCode
      };
    }
    return { 
      success: false, 
      error: 'Erreur de validation',
      code: 'VALIDATION_ERROR' as ErrorCode
    };
  }
}

export function validateClientMessage(message: any): ValidationResult<any> {
  return validateWithZod(clientMessageSchema, message);
}

export function validateAuthMessage(message: any): ValidationResult<any> {
  return validateWithZod(authMessageSchema, message);
}

export function validateLobbyCreateMessage(payload: any): ValidationResult<any> {
  return validateWithZod(lobbyCreateSchema.shape.payload, payload);
}

export function validateLobbyJoinMessage(payload: any): ValidationResult<any> {
  return validateWithZod(lobbyJoinSchema.shape.payload, payload);
}

export function validateLobbyLeaveMessage(payload: any): ValidationResult<any> {
  return validateWithZod(lobbyLeaveSchema.shape.payload, payload);
}

export function validateLobbyStartMessage(payload: any): ValidationResult<any> {
  return validateWithZod(lobbyStartSchema.shape.payload, payload);
}

export function validateGameInputMessage(payload: any): ValidationResult<any> {
  return validateWithZod(gameInputSchema.shape.payload, payload);
}

export function validateBonusActivateMessage(payload: any): ValidationResult<any> {
  return validateWithZod(bonusActivateSchema.shape.payload, payload);
}

export function validatePlayerName(name: any): ValidationResult<string> {
  return validateWithZod(playerNameSchema, name);
}
