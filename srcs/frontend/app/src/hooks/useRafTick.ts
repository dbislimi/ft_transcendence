import { useEffect, useRef } from 'react';

export function useRafTick(active: boolean, callback: () => void) {
  const rafRef = useRef<number>();
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;
  
  useEffect(() => {
    if (!active) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }
    
    function tick() {
      callbackRef.current();
      rafRef.current = requestAnimationFrame(tick);
    }
    
    rafRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [active]);
}
