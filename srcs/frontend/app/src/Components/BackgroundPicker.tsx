import React, { useMemo, useState } from 'react';
import { useBackground, type BackgroundKey } from '../contexts/BackgroundContext';
import { useTranslation } from 'react-i18next';

type Card = {
  key: BackgroundKey;
  label: string;
  previewUrl: string | null;
};

export default function BackgroundPicker({ game }: { game?: 'bombparty' | 'pong' }) {
  const { t } = useTranslation();
  const { getBackgroundFor, setBackgroundFor, setGlobalBackground, getBackgroundUrl, getGlobalBackgroundKey, availableBackgrounds } = useBackground();
  const [applyAll, setApplyAll] = useState(false);

  const current = game ? getBackgroundFor(game) : getGlobalBackgroundKey();

  const cards: Card[] = useMemo(() => {
    const backgrounds = availableBackgrounds.filter(bg => bg.id !== '42background');
    
    return backgrounds.map((bg) => ({
      key: bg.id,
      label: t(`shop.backgrounds.${bg.id}.name`, bg.name),
      previewUrl: bg.url,
    }));
  }, [t, availableBackgrounds]);

  const onSelect = (k: BackgroundKey) => {
    if (!game) {
      setGlobalBackground(k);
      return;
    }
    if (applyAll) setGlobalBackground(k);
    setBackgroundFor(game, k);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            aria-label={t('ui.background.selectAria', { name: c.label })}
            className={`relative rounded-lg overflow-hidden border focus:outline-none focus:ring-2 focus:ring-cyan-400 transition ${
              current === c.key ? 'border-cyan-400' : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="aspect-video w-full bg-slate-800">
              {c.previewUrl ? (
                <div
                  className="w-full h-full"
                  style={{ backgroundImage: `url(${c.previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  {t('ui.background.defaultPreview')}
                </div>
              )}
            </div>
            <div className="px-3 py-2 text-slate-200 text-sm bg-slate-800/80">{c.label}</div>
            {current === c.key && (
              <span className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded bg-cyan-600 text-white">
                {t('ui.background.active')}
              </span>
            )}
          </button>
        ))}
      </div>

      {game && (
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={(e) => setApplyAll(e.target.checked)}
          />
          {t('ui.background.applyAll')}
        </label>
      )}
    </div>
  );
}
