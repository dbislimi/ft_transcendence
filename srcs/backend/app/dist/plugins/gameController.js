import fp from "fastify-plugin";
import { v4 as uuidv4 } from "uuid";
import GamesManager from "../game/GamesManager.ts";
const gameController = async (fastify, options) => {
    const games = new GamesManager();
    fastify.get("/game/ws", { websocket: true }, (socket, req) => {
        const clientId = uuidv4();
        let player;
        socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            console.log(data);
            if (data.event === "start") {
                switch (data.body.action) {
                    case "play_online":
                        player = games.startOnline(clientId, socket);
                        break;
                    case "cancel":
                        games.removeFromQueue(clientId);
                        player = undefined;
                        break;
                    case "play_offline":
                        player = games.startOffline(socket, data.body.diff);
                        break;
                    case "trainbot":
                        games.trainBot(socket, data.body.diff, 1000);
                }
            }
            else if (data.event === "play" && player !== undefined) {
                if (player.playerId === undefined)
                    games
                        .getRoom(player.gameId)
                        ?.move(data.body.type, data.body.dir, data.body.id);
                else
                    games
                        .getRoom(player.gameId)
                        ?.move(data.body.type, data.body.dir, player.playerId);
            }
        });
        socket.on("close", () => {
            console.log("close ", clientId);
            games.removeFromQueue(clientId);
            if (!player)
                return;
            games.getRoom(player.gameId)?.pause();
            games.removeRoom(player.gameId);
        });
    });
};
export default fp(gameController);
