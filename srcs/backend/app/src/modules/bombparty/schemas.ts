import { z } from 'zod';

export const clientMessageSchema = z.object({
  event: z.string(),
  payload: z.any()
});

export const authMessageSchema = z.object({
  event: z.literal('bp:auth'),
  payload: z.object({
    playerName: z.string().min(1).max(50)
  })
});

export const lobbyCreateSchema = z.object({
  event: z.literal('bp:lobby:create'),
  payload: z.object({
    name: z.string().min(1).max(100),
    isPrivate: z.boolean(),
    password: z.string().optional(),
    maxPlayers: z.number().min(2).max(12).optional()
  })
});

export const lobbyJoinSchema = z.object({
  event: z.literal('bp:lobby:join'),
  payload: z.object({
    roomId: z.string().uuid(),
    password: z.string().optional()
  })
});

export const lobbyLeaveSchema = z.object({
  event: z.literal('bp:lobby:leave'),
  payload: z.object({
    roomId: z.string().uuid()
  })
});

export const lobbyStartSchema = z.object({
  event: z.literal('bp:lobby:start'),
  payload: z.object({
    roomId: z.string().uuid()
  })
});

export const gameInputSchema = z.object({
  event: z.literal('bp:game:input'),
  payload: z.object({
    roomId: z.string().uuid(),
    word: z.string().min(1).max(100),
    msTaken: z.number().min(0)
  })
});

export const bonusActivateSchema = z.object({
  event: z.literal('bp:bonus:activate'),
  payload: z.object({
    roomId: z.string().uuid(),
    bonusKey: z.enum(['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'])
  })
});

export const playerNameSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/);
