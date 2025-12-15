import type { FastifyPluginAsync } from "fastify";
import jwt from "jsonwebtoken";

interface FriendEvent {
  type: string;
  from?: number;
  to?: number;
  display_name?: string;
  avatar?: string;
  userId?: number;
  online?: boolean;
  data?: any;
  error?: string;
  message?: string;
}

const SECRET = process.env.JWT_SECRET || "changeme";

let globalActiveConnections = new Map<number, any>();

export function broadcastToUsers(message: FriendEvent, userIds: number[]) {
  userIds.forEach(userId => {
    const connection = globalActiveConnections.get(userId);
    if (connection && connection.readyState === 1) {
      try {
        connection.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[ws-friends] Error sending to user ${userId}:`, error);
        globalActiveConnections.delete(userId);
      }
    }
  });
}

const wsFriends: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws-friends', { websocket: true }, (connection, request) => {
    const token = (request.query as any).token;
    
    if (!token) {
      connection.close(1008, "Token manquant");
      return;
    }

    let userId: number;

    try {
      const decoded = jwt.verify(token, SECRET) as any;
      userId = decoded.id;
      
      const existingConnection = globalActiveConnections.get(userId);
      if (existingConnection && existingConnection !== connection) {
        try {
          existingConnection.close(1000, "New connection established");
        } catch (e) {
        }
      }
      
      globalActiveConnections.set(userId, connection);

      fastify.db.run("UPDATE users SET online = 1 WHERE id = ?", [userId], (err: any) => {
        if (!err) {
          fastify.db.all(
            "SELECT friend_id FROM friends WHERE user_id = ?",
            [userId],
            (err: any, friends: any[]) => {
              if (!err && friends.length > 0) {
                const friendIds = friends.map(f => f.friend_id);
                broadcastToUsers({
                  type: "status_update",
                  userId: userId,
                  online: true
                }, friendIds);
              }
            }
          );
        }
      });

      connection.send(JSON.stringify({
        type: "connected",
        message: "Connecté au système d'amis"
      }));

      connection.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'pong':
              break;

            case 'get_friends':
              fastify.db.all(
                `SELECT u.id, u.display_name, u.avatar, u.online
                 FROM friends f
                 JOIN users u ON u.id = f.friend_id
                 WHERE f.user_id = ?
                 AND NOT EXISTS (
                   SELECT 1 FROM blocked_users b 
                   WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                   OR (b.blocker_id = u.id AND b.blocked_id = ?)
                 )
                 ORDER BY u.online DESC, u.display_name ASC`,
                [userId, userId, userId],
                (err: any, rows: any[]) => {
                  if (err) {
                    connection.send(JSON.stringify({
                      type: 'friends_list',
                      error: 'Erreur serveur'
                    }));
                  } else {
                    connection.send(JSON.stringify({
                      type: 'friends_list',
                      data: rows
                    }));
                  }
                }
              );
              break;

            case 'get_friend_requests':
              fastify.db.all(
                `SELECT fr.sender_id, u.display_name, u.avatar, fr.status, 'received' as type
                 FROM friend_requests fr
                 JOIN users u ON u.id = fr.sender_id
                 WHERE fr.receiver_id = ? AND fr.status = 'pending'
                 AND NOT EXISTS (
                   SELECT 1 FROM blocked_users b 
                   WHERE (b.blocker_id = ? AND b.blocked_id = fr.sender_id)
                   OR (b.blocker_id = fr.sender_id AND b.blocked_id = ?)
                 )
                 ORDER BY fr.created_at DESC`,
                [userId, userId, userId],
                (err1: any, received: any[]) => {
                  if (err1) {
                    connection.send(JSON.stringify({
                      type: 'friend_requests_list',
                      error: 'Erreur serveur'
                    }));
                    return;
                  }

                  fastify.db.all(
                    `SELECT fr.receiver_id as sender_id, u.display_name, u.avatar, fr.status, 'sent' as type
                     FROM friend_requests fr
                     JOIN users u ON u.id = fr.receiver_id
                     WHERE fr.sender_id = ? AND fr.status = 'pending'
                     AND NOT EXISTS (
                       SELECT 1 FROM blocked_users b 
                       WHERE (b.blocker_id = ? AND b.blocked_id = fr.receiver_id)
                       OR (b.blocker_id = fr.receiver_id AND b.blocked_id = ?)
                     )
                     ORDER BY fr.created_at DESC`,
                    [userId, userId, userId],
                    (err2: any, sent: any[]) => {
                      if (err2) {
                        connection.send(JSON.stringify({
                          type: 'friend_requests_list',
                          error: 'Erreur serveur'
                        }));
                      } else {
                        connection.send(JSON.stringify({
                          type: 'friend_requests_list',
                          data: [...received, ...sent]
                        }));
                      }
                    }
                  );
                }
              );
              break;

            case 'get_blocked_users':
              fastify.db.all(
                `SELECT u.id, u.display_name, u.avatar, b.created_at
                 FROM blocked_users b
                 JOIN users u ON u.id = b.blocked_id
                 WHERE b.blocker_id = ?
                 ORDER BY b.created_at DESC`,
                [userId],
                (err: any, rows: any[]) => {
                  if (err) {
                    connection.send(JSON.stringify({
                      type: 'blocked_users_list',
                      error: 'Erreur serveur'
                    }));
                  } else {
                    connection.send(JSON.stringify({
                      type: 'blocked_users_list',
                      data: rows
                    }));
                  }
                }
              );
              break;

            case 'send_friend_request':
              const displayName = data.display_name?.trim();
              if (!displayName) {
                connection.send(JSON.stringify({
                  type: 'friend_request_sent',
                  error: 'Nom d\'utilisateur requis'
                }));
                return;
              }

              fastify.db.serialize(() => {
                fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

                fastify.db.get(
                  "SELECT id, display_name, avatar FROM users WHERE display_name = ?",
                  [displayName],
                  (err: any, friend: any) => {
                    if (err) {
                      fastify.db.run("ROLLBACK");
                      connection.send(JSON.stringify({
                        type: 'friend_request_sent',
                        error: 'Erreur serveur'
                      }));
                      return;
                    }

                    if (!friend) {
                      fastify.db.run("ROLLBACK");
                      connection.send(JSON.stringify({
                        type: 'friend_request_sent',
                        error: 'Utilisateur introuvable'
                      }));
                      return;
                    }

                    if (friend.id === userId) {
                      fastify.db.run("ROLLBACK");
                      connection.send(JSON.stringify({
                        type: 'friend_request_sent',
                        error: 'Impossible de s\'ajouter soi-même'
                      }));
                      return;
                    }

                    fastify.db.get(
                      `SELECT 1 FROM blocked_users WHERE 
                       (blocker_id = ? AND blocked_id = ?) OR 
                       (blocker_id = ? AND blocked_id = ?)`,
                      [userId, friend.id, friend.id, userId],
                      (err: any, isBlocked: any) => {
                        if (err || isBlocked) {
                          fastify.db.run("ROLLBACK");
                          connection.send(JSON.stringify({
                            type: 'friend_request_sent',
                            error: 'Impossible d\'envoyer une demande à cet utilisateur'
                          }));
                          return;
                        }

                        fastify.db.get(
                          "SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?",
                          [userId, friend.id],
                          (err: any, areFriends: any) => {
                            if (err || areFriends) {
                              fastify.db.run("ROLLBACK");
                              connection.send(JSON.stringify({
                                type: 'friend_request_sent',
                                error: areFriends ? 'Vous êtes déjà amis' : 'Erreur serveur'
                              }));
                              return;
                            }

                            fastify.db.get(
                              "SELECT * FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'",
                              [userId, friend.id, friend.id, userId],
                              (err: any, pendingRequest: any) => {
                                if (err) {
                                  fastify.db.run("ROLLBACK");
                                  connection.send(JSON.stringify({
                                    type: 'friend_request_sent',
                                    error: 'Erreur serveur'
                                  }));
                                  return;
                                }

                                if (pendingRequest) {
                                  fastify.db.run("ROLLBACK");
                                  connection.send(JSON.stringify({
                                    type: 'friend_request_sent',
                                    error: pendingRequest.sender_id === userId ? 'Demande déjà envoyée' : 'Cet utilisateur vous a déjà envoyé une demande'
                                  }));
                                  return;
                                }

                                fastify.db.run(
                                  "DELETE FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status != 'pending'",
                                  [userId, friend.id, friend.id, userId],
                                  (err: any) => {
                                    if (err) {
                                      fastify.db.run("ROLLBACK");
                                      connection.send(JSON.stringify({
                                        type: 'friend_request_sent',
                                        error: 'Erreur serveur'
                                      }));
                                      return;
                                    }

                                    fastify.db.run(
                                      "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
                                      [userId, friend.id],
                                      (err: any) => {
                                        if (err) {
                                          fastify.db.run("ROLLBACK");
                                          connection.send(JSON.stringify({
                                            type: 'friend_request_sent',
                                            error: 'Erreur serveur'
                                          }));
                                          return;
                                        }

                                        fastify.db.run("COMMIT", (err: any) => {
                                          if (err) {
                                            fastify.db.run("ROLLBACK");
                                            connection.send(JSON.stringify({
                                              type: 'friend_request_sent',
                                              error: 'Erreur serveur'
                                            }));
                                            return;
                                          }

                                          connection.send(JSON.stringify({
                                            type: 'friend_request_sent',
                                            message: 'Demande d\'ami envoyée avec succès'
                                          }));

                                          fastify.db.get(
                                            "SELECT display_name, avatar FROM users WHERE id = ?",
                                            [userId],
                                            (err: any, senderInfo: any) => {
                                              if (!err && senderInfo) {
                                                broadcastToUsers({
                                                  type: "friend_request_received",
                                                  from: userId,
                                                  display_name: senderInfo.display_name,
                                                  avatar: senderInfo.avatar,
                                                }, [friend.id]);
                                              }
                                            }
                                          );
                                        });
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              });
              break;

            case 'accept_friend_request':
              const senderId = parseInt(data.sender_id);
              if (isNaN(senderId)) {
                connection.send(JSON.stringify({
                  type: 'friend_request_accepted_response',
                  error: 'ID demande invalide'
                }));
                return;
              }

              fastify.db.serialize(() => {
                fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

                fastify.db.get(
                  `SELECT 1 FROM blocked_users WHERE
                   (blocker_id = ? AND blocked_id = ?) OR
                   (blocker_id = ? AND blocked_id = ?)`,
                  [userId, senderId, senderId, userId],
                  (err: any, isBlocked: any) => {
                    if (err || isBlocked) {
                      fastify.db.run("ROLLBACK");
                      connection.send(JSON.stringify({
                        type: 'friend_request_accepted_response',
                        error: 'Impossible d\'accepter cette demande'
                      }));
                      return;
                    }

                    fastify.db.get(
                      "SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
                      [senderId, userId],
                      (err: any, req: any) => {
                        if (err || !req) {
                          fastify.db.run("ROLLBACK");
                          connection.send(JSON.stringify({
                            type: 'friend_request_accepted_response',
                            error: 'Demande introuvable'
                          }));
                          return;
                        }

                        fastify.db.run(
                          "UPDATE friend_requests SET status = 'accepted' WHERE sender_id = ? AND receiver_id = ?",
                          [senderId, userId],
                          (err: any) => {
                            if (err) {
                              fastify.db.run("ROLLBACK");
                              connection.send(JSON.stringify({
                                type: 'friend_request_accepted_response',
                                error: 'Erreur serveur'
                              }));
                              return;
                            }

                            fastify.db.run(
                              "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)",
                              [userId, senderId],
                              (err: any) => {
                                if (err) {
                                  fastify.db.run("ROLLBACK");
                                  connection.send(JSON.stringify({
                                    type: 'friend_request_accepted_response',
                                    error: 'Erreur serveur'
                                  }));
                                  return;
                                }

                                fastify.db.run(
                                  "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)",
                                  [senderId, userId],
                                  (err: any) => {
                                    if (err) {
                                      fastify.db.run("ROLLBACK");
                                      connection.send(JSON.stringify({
                                        type: 'friend_request_accepted_response',
                                        error: 'Erreur serveur'
                                      }));
                                      return;
                                    }

                                    fastify.db.run("COMMIT", (err: any) => {
                                      if (err) {
                                        fastify.db.run("ROLLBACK");
                                        connection.send(JSON.stringify({
                                          type: 'friend_request_accepted_response',
                                          error: 'Erreur serveur'
                                        }));
                                        return;
                                      }

                                      connection.send(JSON.stringify({
                                        type: 'friend_request_accepted_response',
                                        message: 'Demande acceptée'
                                      }));

                                      fastify.db.get(
                                        "SELECT display_name, avatar FROM users WHERE id = ?",
                                        [userId],
                                        (err: any, accepterInfo: any) => {
                                          if (!err && accepterInfo) {
                                            broadcastToUsers({
                                              type: "friend_request_accepted",
                                              from: userId,
                                              display_name: accepterInfo.display_name,
                                              avatar: accepterInfo.avatar,
                                            }, [senderId]);
                                          }
                                        }
                                      );
                                    });
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              });
              break;

            case 'reject_friend_request':
              const rejectSenderId = parseInt(data.sender_id);
              if (isNaN(rejectSenderId)) {
                connection.send(JSON.stringify({
                  type: 'friend_request_rejected_response',
                  error: 'ID demande invalide'
                }));
                return;
              }

              fastify.db.run(
                "UPDATE friend_requests SET status = 'rejected' WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
                [rejectSenderId, userId],
                function (err: any) {
                  if (err) {
                    connection.send(JSON.stringify({
                      type: 'friend_request_rejected_response',
                      error: 'Erreur serveur'
                    }));
                    return;
                  }

                  if (this.changes === 0) {
                    connection.send(JSON.stringify({
                      type: 'friend_request_rejected_response',
                      error: 'Demande introuvable'
                    }));
                    return;
                  }

                  connection.send(JSON.stringify({
                    type: 'friend_request_rejected_response',
                    message: 'Demande rejetée'
                  }));

                  fastify.db.get(
                    "SELECT display_name, avatar FROM users WHERE id = ?",
                    [userId],
                    (err: any, rejecterInfo: any) => {
                      if (!err && rejecterInfo) {
                        broadcastToUsers({
                          type: "friend_request_rejected",
                          from: userId,
                          display_name: rejecterInfo.display_name,
                          avatar: rejecterInfo.avatar,
                        }, [rejectSenderId]);
                      }
                    }
                  );
                }
              );
              break;

            case 'remove_friend':
              const friendId = parseInt(data.friend_id);
              if (isNaN(friendId)) {
                connection.send(JSON.stringify({
                  type: 'friend_removed_response',
                  error: 'ID ami invalide'
                }));
                return;
              }

              fastify.db.serialize(() => {
                fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

                fastify.db.run(
                  "DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
                  [userId, friendId]
                );

                fastify.db.run(
                  "DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
                  [friendId, userId]
                );

                fastify.db.run("COMMIT", (err: any) => {
                  if (err) {
                    fastify.db.run("ROLLBACK");
                    connection.send(JSON.stringify({
                      type: 'friend_removed_response',
                      error: 'Erreur serveur'
                    }));
                    return;
                  }

                  connection.send(JSON.stringify({
                    type: 'friend_removed_response',
                    message: 'Ami supprimé'
                  }));

                  fastify.db.get(
                    "SELECT display_name, avatar FROM users WHERE id = ?",
                    [userId],
                    (err: any, removerInfo: any) => {
                      if (!err && removerInfo) {
                        broadcastToUsers({
                          type: "friend_removed",
                          from: userId,
                          display_name: removerInfo.display_name,
                          avatar: removerInfo.avatar,
                        }, [friendId]);
                      }
                    }
                  );
                });
              });
              break;

            case 'block_user':
              const blockUserId = parseInt(data.user_id);
              if (isNaN(blockUserId) || blockUserId === userId) {
                connection.send(JSON.stringify({
                  type: 'user_blocked_response',
                  error: 'ID utilisateur invalide'
                }));
                return;
              }

              fastify.db.get(
                "SELECT 1 FROM users WHERE id = ?",
                [blockUserId],
                (err: any, userExists: any) => {
                  if (err || !userExists) {
                    connection.send(JSON.stringify({
                      type: 'user_blocked_response',
                      error: 'Utilisateur introuvable'
                    }));
                    return;
                  }

                  fastify.db.serialize(() => {
                    fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

                    fastify.db.run(
                      "INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)",
                      [userId, blockUserId]
                    );

                    fastify.db.run(
                      "DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
                      [userId, blockUserId]
                    );

                    fastify.db.run(
                      "DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
                      [blockUserId, userId]
                    );

                    fastify.db.run(
                      "DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
                      [userId, blockUserId, blockUserId, userId]
                    );

                    fastify.db.run("COMMIT", (err: any) => {
                      if (err) {
                        fastify.db.run("ROLLBACK");
                        connection.send(JSON.stringify({
                          type: 'user_blocked_response',
                          error: 'Erreur serveur'
                        }));
                        return;
                      }

                      connection.send(JSON.stringify({
                        type: 'user_blocked_response',
                        message: 'Utilisateur bloqué avec succès'
                      }));

                      fastify.db.get(
                        "SELECT display_name, avatar FROM users WHERE id = ?",
                        [userId],
                        (err: any, blockerInfo: any) => {
                          if (!err && blockerInfo) {
                            broadcastToUsers({
                              type: "user_blocked",
                              from: userId,
                              display_name: blockerInfo.display_name,
                              avatar: blockerInfo.avatar,
                            }, [blockUserId]);
                          }
                        }
                      );
                    });
                  });
                }
              );
              break;

            case 'unblock_user':
              const unblockUserId = parseInt(data.user_id);
              if (isNaN(unblockUserId)) {
                connection.send(JSON.stringify({
                  type: 'user_unblocked_response',
                  error: 'ID utilisateur invalide'
                }));
                return;
              }

              fastify.db.run(
                "DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?",
                [userId, unblockUserId],
                function (err: any) {
                  if (err) {
                    connection.send(JSON.stringify({
                      type: 'user_unblocked_response',
                      error: 'Erreur serveur'
                    }));
                    return;
                  }

                  if (this.changes === 0) {
                    connection.send(JSON.stringify({
                      type: 'user_unblocked_response',
                      error: 'Utilisateur non bloqué'
                    }));
                    return;
                  }

                  connection.send(JSON.stringify({
                    type: 'user_unblocked_response',
                    message: 'Utilisateur débloqué avec succès'
                  }));
                }
              );
              break;
          }
        } catch (error) {
          console.error("[ws-friends] Error parsing message:", error);
        }
      });

      const setOfflineAndNotify = () => {
        globalActiveConnections.delete(userId);
        
        fastify.db.run("UPDATE users SET online = 0 WHERE id = ?", [userId], (err: any) => {
          if (!err) {
            fastify.db.all(
              "SELECT friend_id FROM friends WHERE user_id = ?",
              [userId],
              (err: any, friends: any[]) => {
                if (!err && friends.length > 0) {
                  const friendIds = friends.map(f => f.friend_id);
                  broadcastToUsers({
                    type: "status_update",
                    userId: userId,
                    online: false
                  }, friendIds);
                }
              }
            );
          }
        });
      };

      connection.on('close', () => {
        console.log(`[ws-friends] User ${userId} disconnected`);
        setOfflineAndNotify();
      });

      connection.on('error', (error) => {
        console.error(`[ws-friends] Connection error for user ${userId}:`, error);
        setOfflineAndNotify();
      });

    } catch (error) {
      console.error("[ws-friends] Authentication error:", error);
      connection.close(1008, "Token invalide");
    }
  });

  const heartbeatInterval = setInterval(() => {
    globalActiveConnections.forEach((connection, userId) => {
      if (connection && connection.readyState === 1) {
        try {
          connection.send(JSON.stringify({ type: "heartbeat" }));
        } catch (error) {
          console.error(`[ws-friends] Heartbeat error for user ${userId}:`, error);
          globalActiveConnections.delete(userId);
          
          fastify.db.run("UPDATE users SET online = 0 WHERE id = ?", [userId], (err: any) => {
            if (!err) {
              fastify.db.all(
                "SELECT friend_id FROM friends WHERE user_id = ?",
                [userId],
                (err: any, friends: any[]) => {
                  if (!err && friends.length > 0) {
                    const friendIds = friends.map(f => f.friend_id);
                    broadcastToUsers({
                      type: "status_update",
                      userId: userId,
                      online: false
                    }, friendIds);
                  }
                }
              );
            }
          });
        }
      } else {
        globalActiveConnections.delete(userId);
        
        fastify.db.run("UPDATE users SET online = 0 WHERE id = ?", [userId], (err: any) => {
          if (!err) {
            fastify.db.all(
              "SELECT friend_id FROM friends WHERE user_id = ?",
              [userId],
              (err: any, friends: any[]) => {
                if (!err && friends.length > 0) {
                  const friendIds = friends.map(f => f.friend_id);
                  broadcastToUsers({
                    type: "status_update",
                    userId: userId,
                    online: false
                  }, friendIds);
                }
              }
            );
          }
        });
      }
    });
  }, 15000);

  fastify.addHook('onClose', (instance, done) => {
    clearInterval(heartbeatInterval);
    globalActiveConnections.forEach((connection) => {
      try {
        connection.close(1000, "Server shutting down");
      } catch (e) {
      }
    });
    globalActiveConnections.clear();
    done();
  });
};

export default wsFriends;