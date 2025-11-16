import React from 'react';
import LobbyScreen from '../LobbyScreen';
import PlayersScreen from '../PlayersScreen';
import type { BombPartyHooksState } from './BombPartyHooks';

interface BombPartyLobbyViewProps {
  state: BombPartyHooksState;
  client: any;
  onLobbyCreate: (meta: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; }) => void;
  onLobbyJoin: (roomId: string, password?: string) => void;
  onBackFromLobby: () => void;
  onLeaveLobby: () => void;
  onStartGame: () => void;
}

export default function BombPartyLobbyView({
  state,
  client,
  onLobbyCreate,
  onLobbyJoin,
  onBackFromLobby,
  onLeaveLobby,
  onStartGame
}: BombPartyLobbyViewProps) {
  if (state.gamePhase === 'LOBBY') {
    return (
      <LobbyScreen 
        onCreate={onLobbyCreate} 
        onJoin={onLobbyJoin} 
        onBack={onBackFromLobby} 
        isAuthenticated={true}
        client={client}
      />
    );
  }

  if (state.gamePhase === 'PLAYERS') {
    return (
      <PlayersScreen
        roomId={state.roomId || ''}
        players={state.lobbyPlayers}
        maxPlayers={state.lobbyMaxPlayers}
        isHost={state.isHost}
        onStart={onStartGame}
        onLeave={onLeaveLobby}
      />
    );
  }

  return null;
}
