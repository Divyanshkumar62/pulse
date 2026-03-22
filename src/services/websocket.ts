import { useTabStore } from '../stores/useTabStore';
import { WebSocketMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

class WebSocketManager {
  private sockets: Map<string, WebSocket> = new Map();

  connect(tabId: string, url: string) {
    if (this.sockets.has(tabId)) {
        this.disconnect(tabId);
    }

    try {
      const socket = new WebSocket(url);
      this.sockets.set(tabId, socket);
      
      const { setWsStatus, addWsMessage } = useTabStore.getState();
      
      setWsStatus(tabId, 'connecting');

      socket.onopen = () => {
        setWsStatus(tabId, 'connected');
        addWsMessage(tabId, this.createMetaMessage('Connected to ' + url));
      };

      socket.onmessage = (event) => {
        addWsMessage(tabId, {
          id: uuidv4(),
          type: 'receive',
          content: event.data.toString(),
          timestamp: new Date().toISOString()
        });
      };

      socket.onclose = () => {
        setWsStatus(tabId, 'disconnected');
        addWsMessage(tabId, this.createMetaMessage('Disconnected'));
        this.sockets.delete(tabId);
      };

      socket.onerror = () => {
        setWsStatus(tabId, 'error');
        addWsMessage(tabId, {
          id: uuidv4(),
          type: 'error',
          content: 'WebSocket Error',
          timestamp: new Date().toISOString()
        });
      };

    } catch (error: any) {
        useTabStore.getState().setWsStatus(tabId, 'error');
        useTabStore.getState().addWsMessage(tabId, {
            id: uuidv4(),
            type: 'error',
            content: error.message,
            timestamp: new Date().toISOString()
        });
    }
  }

  disconnect(tabId: string) {
    const socket = this.sockets.get(tabId);
    if (socket) {
      socket.close();
      this.sockets.delete(tabId);
    }
  }

  send(tabId: string, content: string) {
    const socket = this.sockets.get(tabId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(content);
      useTabStore.getState().addWsMessage(tabId, {
        id: uuidv4(),
        type: 'send',
        content,
        timestamp: new Date().toISOString()
      });
    }
  }

  private createMetaMessage(content: string): WebSocketMessage {
    return {
      id: uuidv4(),
      type: 'meta',
      content,
      timestamp: new Date().toISOString()
    };
  }
}

export const wsManager = new WebSocketManager();
