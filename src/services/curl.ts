import { Request, KeyValuePair, RequestBody } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * A basic cURL parser for Pulse.
 * Supports: -X, -H, -d, --data, --data-raw, -G, --get, and basic URLs.
 */
export class CurlParser {
  static parse(curlString: string): Request {
    const lines = curlString.trim().split('\n');
    const fullCommand = lines.map(line => line.trim().replace(/\\$/, '')).join(' ');
    
    // Naive regex-based tokenization (handles some quotes)
    const tokens: string[] = [];
    let currentToken = '';
    let inQuotes: string | null = null;
    
    for (let i = 0; i < fullCommand.length; i++) {
      const char = fullCommand[i];
      if ((char === '"' || char === "'") && (i === 0 || fullCommand[i - 1] !== '\\')) {
        if (inQuotes === char) {
          inQuotes = null;
        } else if (inQuotes === null) {
          inQuotes = char;
        } else {
          currentToken += char;
        }
      } else if (char === ' ' && inQuotes === null) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
    if (currentToken) tokens.push(currentToken);

    const result: Request = {
      id: uuidv4(),
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: [],
      body: { type: 'none', content: '' },
      params: [],
    };

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token === 'curl') {
        i++;
        continue;
      }

      if (token === '-X' || token === '--request') {
        result.method = tokens[i + 1]?.toUpperCase() as any || 'GET';
        i += 2;
        continue;
      }

      if (token === '-H' || token === '--header') {
        const headerRaw = tokens[i + 1];
        if (headerRaw) {
          const colonIndex = headerRaw.indexOf(':');
          if (colonIndex !== -1) {
            const key = headerRaw.substring(0, colonIndex).trim();
            const value = headerRaw.substring(colonIndex + 1).trim();
            result.headers.push({ key, value, enabled: true });
          }
        }
        i += 2;
        continue;
      }

      if (token === '-d' || token === '--data' || token === '--data-raw') {
        const bodyContent = tokens[i + 1];
        if (bodyContent) {
          result.body = { type: 'raw', content: bodyContent };
          if (result.method === 'GET') result.method = 'POST'; // Default to POST if data is present
        }
        i += 2;
        continue;
      }

      if (token === '-G' || token === '--get') {
        result.method = 'GET';
        i++;
        continue;
      }

      // If it looks like a URL and isn't a flag
      if (!token.startsWith('-') && !result.url) {
        result.url = token;
        result.name = `Imported: ${token.split('/').pop() || 'Request'}`;
      }

      i++;
    }

    return result;
  }
}
