const sanitizePayload = (payload: any): any => {
  if (!payload) return payload;
  const regex = /secret|password|token|key|api[_-]?key|authorization|credential/i;
  
  if (typeof payload === 'string') {
    return regex.test(payload) ? '[REDACTED]' : payload;
  }
  
  if (typeof payload === 'object') {
    if (Array.isArray(payload)) {
      return payload.map(sanitizePayload);
    }
    const sanitized: any = {};
    for (const [key, value] of Object.entries(payload)) {
      if (regex.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizePayload(value);
      }
    }
    return sanitized;
  }
  
  return payload;
};

export const logger = {
  store: (storeName: string, action: string, payload?: any, result?: 'OK' | 'ERR') => {
    let msg = `[Pulse Frontend] [Store: ${storeName}] Action: ${action}`;
    if (result) msg += ` | Result: ${result}`;
    if (payload) {
        const safePayload = sanitizePayload(payload);
        if (result === 'ERR') {
             console.error(msg, '| Payload:', safePayload);
        } else {
             console.log(msg, '| Payload:', safePayload);
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
         const safePayload = sanitizePayload(payload);
         if (result === 'ERR') {
              console.error(msg, '| Payload:', safePayload);
         } else {
              console.log(msg, '| Payload:', safePayload);
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
    console.error(`[Pulse Frontend] [Error: ${context}] ${message}`, error ? sanitizePayload(error) : '');
  },
  info: (context: string, message: string, payload?: any) => {
    console.log(`[Pulse Frontend] [Info: ${context}] ${message}`, payload ? sanitizePayload(payload) : '');
  }
};
