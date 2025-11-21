import fp from "fastify-plugin";
import { DEFAULT_GAME_SPEED, DEFAULT_MAX_SCORE, DEFAULT_BONUS_TIME, DEFAULT_BONUS_RADIUS, DEFAULT_COUNTDOWN_SECONDS } from "../pong/config.ts";

export default fp(async (fastify: any) => {
  fastify.get('/pong/config', async () => {
    return {
      gameSpeed: DEFAULT_GAME_SPEED,
      maxScore: DEFAULT_MAX_SCORE,
      bonusTime: DEFAULT_BONUS_TIME,
      bonusRadius: DEFAULT_BONUS_RADIUS,
      countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
    };
  });
});
