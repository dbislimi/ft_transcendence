import { logger } from '../utils/logger';

type TimerCallback = () => void;

interface TimerEntry {
  id: number;
  type: 'timeout' | 'interval';
  callback: TimerCallback;
  delay: number;
  handle: number;
}

class TimerService {
  private timers: Map<number, TimerEntry> = new Map();
  private nextId = 1;

  setTimeout(callback: TimerCallback, delay: number): number {
    const id = this.nextId++;
    
    const handle = window.setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, delay);
    
    this.timers.set(id, {
      id,
      type: 'timeout',
      callback,
      delay,
      handle
    });
    
    return id;
  }

  setInterval(callback: TimerCallback, delay: number): number {
    const id = this.nextId++;
    
    const handle = window.setInterval(callback, delay);
    
    this.timers.set(id, {
      id,
      type: 'interval',
      callback,
      delay,
      handle
    });
    
    return id;
  }

  clearTimeout(id: number): void {
    const timer = this.timers.get(id);
    if (timer && timer.type === 'timeout') {
      window.clearTimeout(timer.handle);
      this.timers.delete(id);
    }
  }

  clearInterval(id: number): void {
    const timer = this.timers.get(id);
    if (timer && timer.type === 'interval') {
      window.clearInterval(timer.handle);
      this.timers.delete(id);
    }
  }

  clearAll(): void {
    this.timers.forEach(timer => {
      if (timer.type === 'timeout') {
        window.clearTimeout(timer.handle);
      } else {
        window.clearInterval(timer.handle);
      }
    });
    this.timers.clear();
    logger.debug('cleared all timers', { count: this.timers.size });
  }

  getActiveTimersCount(): number {
    return this.timers.size;
  }
}

export const timerService = new TimerService();

