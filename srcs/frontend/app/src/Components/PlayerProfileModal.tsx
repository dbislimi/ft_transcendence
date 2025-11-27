import React from 'react';
import { usePlayerProfile } from '../hook/usePlayerProfile';

interface PlayerProfileModalProps {
  playerId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function PlayerProfileModal({ playerId, open, onClose }: PlayerProfileModalProps) {
  const { profile } = usePlayerProfile(playerId);

  if (!open || !playerId || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          {profile.avatarUrl && (
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="w-16 h-16 rounded-full border-2 border-slate-600"
            />
          )}
          <div>
            <p className="text-slate-400 text-sm">
              Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Statistiques</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-400 text-sm">Victoires</p>
                <p className="text-green-400 font-bold text-xl">{profile.stats.wins}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Defaites</p>
                <p className="text-red-400 font-bold text-xl">{profile.stats.losses}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Temps de jeu total</p>
            <p className="text-white font-bold">
              {Math.floor(profile.totalPlayTimeMs / 1000 / 60)} minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
