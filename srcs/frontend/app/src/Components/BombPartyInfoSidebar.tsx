import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { STREAK_FOR_BONUS, type BonusKey } from '../game-bomb-party/core/types';

interface BombPartyInfoSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function BombPartyInfoSidebar({ open, onClose }: BombPartyInfoSidebarProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, [open]);

  if (!open) return null;

  const bonuses: Array<{ key: BonusKey; icon: string; nameKey: string; descKey: string }> = [
    { key: 'inversion', icon: '🔁', nameKey: 'bombParty.bonus.inversion.name', descKey: 'bombParty.bonus.inversion.desc' },
    { key: 'plus5sec', icon: '➕', nameKey: 'bombParty.bonus.plus5sec.name', descKey: 'bombParty.bonus.plus5sec.desc' },
    { key: 'vitesseEclair', icon: '⚡', nameKey: 'bombParty.bonus.vitesseEclair.name', descKey: 'bombParty.bonus.vitesseEclair.desc' },
    { key: 'doubleChance', icon: '♢', nameKey: 'bombParty.bonus.doubleChance.name', descKey: 'bombParty.bonus.doubleChance.desc' },
    { key: 'extraLife', icon: '❤️', nameKey: 'bombParty.bonus.extraLife.name', descKey: 'bombParty.bonus.extraLife.desc' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('bombParty.info.title')}
        ref={ref}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{t('bombParty.info.title')}</h2>
          <button onClick={onClose} className="rounded p-2 hover:bg-slate-800 text-slate-300" aria-label={t('bombParty.info.closeAria')}>
            ✕
          </button>
        </div>
        <div className="p-4 text-slate-200 space-y-6 overflow-y-auto h-full">
          <section>
            <h3 className="text-sm text-slate-400 mb-2">{t('bombParty.info.howToGetTitle')}</h3>
            <p className="text-slate-300">
              {t('bombParty.info.streakRule', { n: STREAK_FOR_BONUS })}
            </p>
          </section>

          <section>
            <h3 className="text-sm text-slate-400 mb-3">{t('bombParty.info.bonusesTitle')}</h3>
            <div className="space-y-3">
              {bonuses.map((b) => (
                <div key={b.key} className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/40">
                  <div className="text-xl leading-none">{b.icon}</div>
                  <div>
                    <div className="text-slate-200 font-medium">{t(b.nameKey)}</div>
                    <div className="text-slate-400 text-sm">{t(b.descKey)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}


