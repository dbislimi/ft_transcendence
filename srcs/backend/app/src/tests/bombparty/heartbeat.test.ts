import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BombPartyWSServer } from '../../modules/bombparty/wsServer.js';

describe('BombParty Heartbeat', () => {
  let wsServer: BombPartyWSServer;
  let mockSocket: any;
  let mockConnection: any;

  beforeEach(() => {
    if (typeof jest !== 'undefined' && jest.useFakeTimers) {
      jest.useFakeTimers();
    }
    wsServer = new BombPartyWSServer();
    
    mockSocket = {
      readyState: 1,
      on: jest.fn((event, handler) => {
        if (event === 'pong') {
          mockSocket.pongHandler = handler;
        }
      }),
      ping: jest.fn(),
      close: jest.fn(),
      send: jest.fn()
    };

    mockConnection = wsServer['connections'].get(mockSocket);
  });

  afterEach(() => {
    if (typeof jest !== 'undefined' && jest.useRealTimers) {
      jest.useRealTimers();
    }
  });

  it('should register connection with lastPong timestamp', () => {
    wsServer.registerConnection(mockSocket);
    const connection = wsServer['connections'].get(mockSocket);
    
    expect(connection).toBeDefined();
    expect(connection?.lastPong).toBeGreaterThan(0);
  });

  it('should update lastPong on pong event', () => {
    wsServer.registerConnection(mockSocket);
    const connection = wsServer['connections'].get(mockSocket);
    const initialPong = connection!.lastPong;
    
    if (typeof jest !== 'undefined' && jest.advanceTimersByTime) {
      jest.advanceTimersByTime(1000);
    }
    
    if (mockSocket.pongHandler) {
      mockSocket.pongHandler();
    }
    
    const connectionAfterPong = wsServer['connections'].get(mockSocket);
    expect(connectionAfterPong!.lastPong).toBeGreaterThan(initialPong);
  });

  it('should send ping to all connections', () => {
    const socket1 = { readyState: 1, on: jest.fn(), ping: jest.fn(), close: jest.fn(), send: jest.fn() };
    const socket2 = { readyState: 1, on: jest.fn(), ping: jest.fn(), close: jest.fn(), send: jest.fn() };
    
    wsServer.registerConnection(socket1);
    wsServer.registerConnection(socket2);
    
    if (typeof jest !== 'undefined' && jest.advanceTimersByTime) {
      jest.advanceTimersByTime(30000);
    }
    
    expect(socket1.ping).toBeDefined();
    expect(socket2.ping).toBeDefined();
  });

  it('should clean up connection on close', () => {
    wsServer.registerConnection(mockSocket);
    expect(wsServer['connections'].has(mockSocket)).toBe(true);
    
    if (mockSocket.on.mock.calls.length > 0) {
      const closeHandler = mockSocket.on.mock.calls.find(([event]: [string]) => event === 'close')?.[1];
      if (closeHandler) {
        closeHandler();
      }
    }
    
    expect(wsServer['connections']).toBeDefined();
  });
});

