import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { usePlayerProfile } from '../hook/usePlayerProfile';

interface PlayerProfileModalProps {
  playerId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function PlayerProfileModal({ playerId, open, onClose }: PlayerProfileModalProps) {
  const { t } = useTranslation();
  const { profile, loading, error } = usePlayerProfile(playerId);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" aria-hidden={!open}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.title')}
        ref={dialogRef}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{t('profile.title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('profile.closeAria')}
            className="rounded p-2 hover:bg-slate-800 text-slate-300"
          >
            ✕
          </button>
        </div>
        <div className="p-4 text-slate-200">
          {loading && (
            <div className="text-slate-400">{t('profile.loading')}</div>
          )}
          {error && (
            <div className="text-red-400 mb-3">{t('profile.error')}</div>
          )}
          {!loading && profile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={profile.avatarUrl} alt={profile.username} className="w-14 h-14 rounded-full border border-slate-700" />
                <div>
                  <div className="text-lg font-semibold">{profile.username}</div>
                  {profile.createdAt && (
                    <div className="text-sm text-slate-400">{t('profile.memberSince', { date: new Date(profile.createdAt).toLocaleDateString() })}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label={t('profile.stats.games')} value={(profile.stats?.wins ?? 0) + (profile.stats?.losses ?? 0)} />
                <Stat label={t('profile.stats.wins')} value={profile.stats?.wins} />
                <Stat label={t('profile.stats.winrate')} value={computeWinrate(profile.stats?.wins, profile.stats?.losses)} />
                <Stat label={t('profile.stats.playtime')} value={formatPlaytimeMs(profile.totalPlayTimeMs)} />
              </div>

              {error && (
                <button onClick={onClose} className="mt-2 px-4 py-2 rounded border border-slate-600 text-slate-300">
                  {t('profile.retry')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700 p-3 bg-slate-800/50">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-base text-white font-medium">{value ?? '—'}</div>
    </div>
  );
}

function formatPlaytimeMs(ms?: number) {
  if (!ms || ms <= 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function computeWinrate(wins?: number, losses?: number) {
  const w = wins ?? 0;
  const l = losses ?? 0;
  const total = w + l;
  if (total === 0) return '—';
  return `${Math.round((w / total) * 100)}%`;
}


