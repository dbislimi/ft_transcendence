import { z } from 'zod';
import { clientMessageSchema, authMessageSchema, lobbyCreateSchema, lobbyJoinSchema, lobbyLeaveSchema, lobbyStartSchema, gameInputSchema, bonusActivateSchema, playerNameSchema } from './schemas.ts';
function validateWithZod(schema, data) {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors.map(e => e.message).join(', '),
                code: 'VALIDATION_ERROR'
            };
        }
        return {
            success: false,
            error: 'Erreur de validation',
            code: 'VALIDATION_ERROR'
        };
    }
}
export function validateClientMessage(message) {
    return validateWithZod(clientMessageSchema, message);
}
export function validateAuthMessage(message) {
    return validateWithZod(authMessageSchema, message);
}
export function validateLobbyCreateMessage(payload) {
    return validateWithZod(lobbyCreateSchema.shape.payload, payload);
}
export function validateLobbyJoinMessage(payload) {
    return validateWithZod(lobbyJoinSchema.shape.payload, payload);
}
export function validateLobbyLeaveMessage(payload) {
    return validateWithZod(lobbyLeaveSchema.shape.payload, payload);
}
export function validateLobbyStartMessage(payload) {
    return validateWithZod(lobbyStartSchema.shape.payload, payload);
}
export function validateGameInputMessage(payload) {
    return validateWithZod(gameInputSchema.shape.payload, payload);
}
export function validateBonusActivateMessage(payload) {
    return validateWithZod(bonusActivateSchema.shape.payload, payload);
}
export function validatePlayerName(name) {
    return validateWithZod(playerNameSchema, name);
}
