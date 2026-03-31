export const logger = {
  store: (storeName: string, action: string, payload?: any, result?: 'OK' | 'ERR') => {
    let msg = `[Pulse Frontend] [Store: ${storeName}] Action: ${action}`;
    if (result) msg += ` | Result: ${result}`;
    if (payload) {
        if (result === 'ERR') {
             console.error(msg, '| Payload:', payload);
        } else {
             console.log(msg, '| Payload:', payload);
        }
    } else {
         if (result === 'ERR') {
              console.error(msg);
         } else {
              console.log(msg);
         }
    }
  },
  tauri: (command: string, payload?: any, result?: 'OK' | 'ERR') => {
    let msg = `[Pulse Frontend] [Tauri: ${command}]`;
    if (result) msg += ` | Result: ${result}`;
    if (payload) {
         if (result === 'ERR') {
              console.error(msg, '| Payload:', payload);
         } else {
              console.log(msg, '| Payload:', payload);
         }
    } else {
         if (result === 'ERR') {
             console.error(msg);
         } else {
             console.log(msg);
         }
    }
  },
  error: (context: string, message: string, error?: any) => {
    console.error(`[Pulse Frontend] [Error: ${context}] ${message}`, error ? error : '');
  },
  info: (context: string, message: string, payload?: any) => {
    console.log(`[Pulse Frontend] [Info: ${context}] ${message}`, payload ? payload : '');
  }
};
