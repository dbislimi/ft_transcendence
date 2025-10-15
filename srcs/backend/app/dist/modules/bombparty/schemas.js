import { z } from 'zod';
export const errorCodeSchema = z.enum(['VALIDATION_ERROR', 'STATE_ERROR', 'AUTH_ERROR', 'NETWORK_ERROR']);
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
        isPrivate: z.boolean().optional().default(false),
        password: z.string().optional(),
        maxPlayers: z.number().min(2).max(12).optional().default(4)
    })
});
export const lobbyJoinSchema = z.object({
    event: z.literal('bp:lobby:join'),
    payload: z.object({
        roomId: z.string().min(1),
        password: z.string().optional()
    })
});
export const lobbyLeaveSchema = z.object({
    event: z.literal('bp:lobby:leave'),
    payload: z.object({
        roomId: z.string().min(1)
    })
});
export const lobbyListSchema = z.object({
    event: z.literal('bp:lobby:list'),
    payload: z.object({
        filter: z.object({
            openOnly: z.boolean().optional().default(true)
        }).optional()
    })
});
export const lobbyStartSchema = z.object({
    event: z.literal('bp:lobby:start'),
    payload: z.object({
        roomId: z.string().min(1)
    })
});
export const gameInputSchema = z.object({
    event: z.literal('bp:game:input'),
    payload: z.object({
        roomId: z.string().min(1),
        word: z.string().min(1).max(100),
        msTaken: z.number().min(0)
    })
});
export const bonusActivateSchema = z.object({
    event: z.literal('bp:bonus:activate'),
    payload: z.object({
        roomId: z.string().min(1),
        bonusKey: z.enum(['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'])
    })
});
export const heartbeatSchema = z.object({
    event: z.literal('bp:heartbeat'),
    payload: z.object({
        timestamp: z.number()
    })
});
export const pongSchema = z.object({
    event: z.literal('bp:pong'),
    payload: z.object({
        timestamp: z.number()
    })
});
export const playerNameSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/);
export const roomPublicStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    isPrivate: z.boolean(),
    players: z.array(z.object({
        id: z.string(),
        name: z.string()
    })),
    maxPlayers: z.number(),
    isStarted: z.boolean(),
    createdAt: z.number()
});
export const roomListItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    players: z.number(),
    maxPlayers: z.number(),
    isStarted: z.boolean(),
    createdAt: z.number()
});
export const turnStartedEventSchema = z.object({
    event: z.literal('bp:turn:started'),
    payload: z.object({
        turnStartedAt: z.number(),
        turnDurationMs: z.number(),
        currentPlayerId: z.string()
    })
});
export const gameStateSyncEventSchema = z.object({
    event: z.literal('bp:game:state'),
    payload: z.any()
});
export const lobbyCreatedResponseSchema = z.object({
    event: z.literal('bp:lobby:created'),
    payload: z.object({
        roomId: z.string()
    })
});
export const lobbyJoinedResponseSchema = z.object({
    event: z.literal('bp:lobby:joined'),
    payload: z.object({
        roomId: z.string(),
        snapshot: roomPublicStateSchema
    })
});
export const lobbyLeftResponseSchema = z.object({
    event: z.literal('bp:lobby:left'),
    payload: z.object({
        roomId: z.string()
    })
});
export const lobbyListResponseSchema = z.object({
    event: z.literal('bp:lobby:list:result'),
    payload: z.object({
        rooms: z.array(roomListItemSchema)
    })
});
export const lobbyUpdateBroadcastSchema = z.object({
    event: z.literal('bp:lobby:update'),
    payload: z.object({
        roomId: z.string(),
        snapshot: roomPublicStateSchema
    })
});
export const errorResponseSchema = z.object({
    event: z.literal('bp:error'),
    payload: z.object({
        code: errorCodeSchema,
        msg: z.string()
    })
});
export const pingSchema = z.object({
    event: z.literal('bp:ping'),
    payload: z.object({
        timestamp: z.number()
    })
});
export const allClientMessageSchemas = z.union([
    authMessageSchema,
    lobbyCreateSchema,
    lobbyJoinSchema,
    lobbyLeaveSchema,
    lobbyListSchema,
    lobbyStartSchema,
    gameInputSchema,
    bonusActivateSchema,
    heartbeatSchema,
    pongSchema
]);
export const allServerMessageSchemas = z.union([
    lobbyCreatedResponseSchema,
    lobbyJoinedResponseSchema,
    lobbyLeftResponseSchema,
    lobbyListResponseSchema,
    lobbyUpdateBroadcastSchema,
    turnStartedEventSchema,
    gameStateSyncEventSchema,
    errorResponseSchema,
    pingSchema
]);
