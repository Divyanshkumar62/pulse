import { Request, KeyValuePair, RequestBody } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * A robust cURL parser for Pulse.
 * Supports: -X, -H, -d, --data, --data-raw, -G, --get, and correctly handles
 * strings with escaped quotes, single quotes, double quotes, and line continuations.
 */
export class CurlParser {
  static parse(curlString: string): Request {
    // Basic cleanup of line continuations allowing multi-line curl commands
    let cleanString = curlString.trim();
    
    const tokens: string[] = [];
    let currentToken = '';
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let escaping = false;

    for (let i = 0; i < cleanString.length; i++) {
      const c = cleanString[i];

      if (escaping) {
        if (c === '\n' || c === '\r') {
           // Line continuation ignored
        } else {
           // If we were escaping a character format, we might want to keep the backslash in some contexts
           // But in Bash, \ escaping removes the \ except if it's not a special char.
           // For simplicity in JSON body contexts, let's keep the \ if we are inside a quote,
           // unless it's escaped quote itself inside a double quote.
           if (inDoubleQuote && (c === '"' || c === '\\')) {
             currentToken += c;
           } else if (inSingleQuote) {
             currentToken += '\\' + c;
           } else {
             // Outside quotes or normal escape, just add the char
             currentToken += c;
           }
        }
        escaping = false;
        continue;
      }

      if (c === '\\') {
        if (inSingleQuote) {
          // In Bash single quotes, backslash is literal
          currentToken += c;
        } else {
          escaping = true;
        }
        continue; 
      }

      if (!inSingleQuote && c === '"') {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (!inDoubleQuote && c === "'") {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (/\s/.test(c) && !inSingleQuote && !inDoubleQuote) {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = '';
        }
        continue;
      }

      currentToken += c;
    }

    if (currentToken.length > 0) {
      tokens.push(currentToken);
    }

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

      if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
        const bodyContent = tokens[i + 1];
        if (bodyContent !== undefined) {
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
        // Handle URL that might have quotes that got stripped
        result.url = token.replace(/^["'](.*)["']$/, '$1');
        result.name = `Imported: ${result.url.split('?')[0].split('/').pop() || 'Request'}`;
      }

      i++;
    }

    return result;
  }
}
