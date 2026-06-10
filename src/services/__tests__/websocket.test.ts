import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wsManager } from '../websocket';
import { useTabStore } from '../../stores/useTabStore';

vi.mock('../../stores/useTabStore', () => ({
  useTabStore: {
    getState: vi.fn(() => ({
      setWsStatus: vi.fn(),
      addWsMessage: vi.fn()
    }))
  }
}));

describe('WebSocketManager', () => {
  let mockWebSocket: any;
  let mockState: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1 // WebSocket.OPEN
    };
    
    (globalThis as any).WebSocket = class {
      static OPEN = 1;
      readyState = 1;
      send = mockWebSocket.send;
      close = mockWebSocket.close;
      onopen: any;
      onmessage: any;
      onclose: any;
      onerror: any;
      constructor(public url: string) {
        // Expose instance to test so we can trigger events
        mockWebSocket.instance = this;
      }
    } as any;
    
    mockState = {
      setWsStatus: vi.fn(),
      addWsMessage: vi.fn()
    };
    (useTabStore.getState as any).mockReturnValue(mockState);
  });

  it('should initiate connection and set status to connecting', () => {
    wsManager.connect('tab-1', 'wss://echo.websocket.org');
    
    expect(mockWebSocket.instance.url).toBe('wss://echo.websocket.org');
    expect(mockState.setWsStatus).toHaveBeenCalledWith('tab-1', 'connecting');
  });

  it('should handle onopen event', () => {
    wsManager.connect('tab-1', 'wss://echo.websocket.org');
    
    mockWebSocket.instance.onopen();
    
    expect(mockState.setWsStatus).toHaveBeenCalledWith('tab-1', 'connected');
    expect(mockState.addWsMessage).toHaveBeenCalledWith('tab-1', expect.objectContaining({
      type: 'meta',
      content: 'Connected to wss://echo.websocket.org'
    }));
  });

  it('should handle incoming messages', () => {
    wsManager.connect('tab-1', 'wss://echo.websocket.org');
    
    mockWebSocket.instance.onmessage({ data: 'Hello World' });
    
    expect(mockState.addWsMessage).toHaveBeenCalledWith('tab-1', expect.objectContaining({
      type: 'received',
      content: 'Hello World'
    }));
  });

  it('should handle disconnect and cleanup', () => {
    wsManager.connect('tab-1', 'wss://echo.websocket.org');
    
    wsManager.disconnect('tab-1');
    
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should send messages if socket is open', () => {
    wsManager.connect('tab-1', 'wss://echo.websocket.org');
    
    wsManager.send('tab-1', 'Ping');
    
    expect(mockWebSocket.send).toHaveBeenCalledWith('Ping');
    expect(mockState.addWsMessage).toHaveBeenCalledWith('tab-1', expect.objectContaining({
      type: 'send',
      content: 'Ping'
    }));
  });
});
