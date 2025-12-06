import React from 'react';
import { useTranslation } from 'react-i18next';

export function BottomLeftDebugSuggestions({
  title,
  words,
  syllableInfo,
}: {
  title: string;
  words: string[];
  syllableInfo: { availableWords: number; totalWords: number } | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 text-xs rounded bg-slate-800/80 border border-slate-600 text-slate-300 hover:text-white"
      >
        {open ? t('bombParty.debug.hide') : t('bombParty.debug.show')}
      </button>
      {open && (
        <div className="mt-2 bg-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/30 p-3 max-w-xs">
          <div className="text-xs text-slate-400 mb-2">
            {title}
            {syllableInfo && (
              <span className="ml-2 text-[10px] text-slate-500">
                {syllableInfo.availableWords}/{syllableInfo.totalWords}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {words.map((word, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-600/30 text-purple-200 text-[10px] rounded-md border border-purple-500/30"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DraggablePanel({
  children,
  initialOffset = { x: 0, y: 0 },
}: {
  children: React.ReactNode;
  initialOffset?: { x: number; y: number };
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 24, y: window.innerHeight - 200 });
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const startRef = React.useRef<{ mx: number; my: number; x: number; y: number } | null>(null);

  React.useEffect(() => {
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const next = { x: Math.round(w / 2) + initialOffset.x, y: Math.round(h / 2) + initialOffset.y };
      setPos({ x: clamp(next.x, 16, w - 320), y: clamp(next.y, 16, h - 120) });
    } catch (err) {
      console.error('[DraggablePanel] Error in position initialization', err);
      setError('Erreur d\'initialisation');
    }
  }, [initialOffset.x, initialOffset.y]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      try {
        if (!dragging || !startRef.current) return;
        const dx = e.clientX - startRef.current.mx;
        const dy = e.clientY - startRef.current.my;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cardW = cardRef.current?.offsetWidth ?? 320;
        const cardH = cardRef.current?.offsetHeight ?? 160;
        const nx = clamp(startRef.current.x + dx, 8, w - cardW - 8);
        const ny = clamp(startRef.current.y + dy, 8, h - cardH - 8);
        setPos({ x: nx, y: ny });
      } catch (err) {
        console.error('[DraggablePanel] Error in onMove', err);
      }
    };
    const onUp = () => {
      try {
        setDragging(false);
        startRef.current = null;
      } catch (err) {
        console.error('[DraggablePanel] Error in onUp', err);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const onDown = (e: React.MouseEvent) => {
    try {
      startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
      setDragging(true);
    } catch (err) {
      console.error('[DraggablePanel] Error in onDown', err);
    }
  };

  if (error) {
    return (
      <div className="fixed z-40 bottom-4 right-4 p-4 bg-red-500/80 text-white rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-40 pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="pointer-events-auto select-none cursor-grab active:cursor-grabbing mb-2 flex items-center gap-2">
        <div
          onMouseDown={onDown}
          className="h-3 w-28 rounded-full bg-slate-600/80 hover:bg-slate-500/90 transition-colors"
          title="Drag"
        />
      </div>
      <div ref={cardRef} className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

