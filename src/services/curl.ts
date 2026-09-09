import { Request, KeyValuePair } from '../types';
import { v4 as uuidv4 } from 'uuid';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

const FLAGS_WITHOUT_ARGS = new Set([
  '-L', '--location',
  '-k', '--insecure',
  '-v', '--verbose',
  '-s', '--silent',
  '-i', '--include',
  '-f', '--fail',
  '--compressed',
  '--use-ascii',
  '--ssl-no-revoke',
  '-g', '--globoff'
]);

function extractQueryParams(urlStr: string): { cleanUrl: string; params: KeyValuePair[] } {
  const queryIndex = urlStr.indexOf('?');
  if (queryIndex === -1) {
    return { cleanUrl: urlStr, params: [] };
  }

  const queryString = urlStr.substring(queryIndex + 1);
  const params: KeyValuePair[] = [];
  const pairs = queryString.split('&');

  for (const pair of pairs) {
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    if (eqIndex !== -1) {
      try {
        const key = decodeURIComponent(pair.substring(0, eqIndex));
        const value = decodeURIComponent(pair.substring(eqIndex + 1));
        params.push({ key, value, enabled: true });
      } catch {
        params.push({ key: pair.substring(0, eqIndex), value: pair.substring(eqIndex + 1), enabled: true });
      }
    } else {
      try {
        params.push({ key: decodeURIComponent(pair), value: '', enabled: true });
      } catch {
        params.push({ key: pair, value: '', enabled: true });
      }
    }
  }

  return { cleanUrl: urlStr, params };
}

function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  return str;
}

/**
 * Enhanced cURL and Postman code snippet parser for Pulse.
 * Supports:
 * - Postman cURL exports starting with HTTP method (e.g. POST 'https://...')
 * - Standard cURL commands with -X, --request, -H, --header, -d, --data, --data-raw, --body, etc.
 * - Basic auth (-u / --user), Cookies (-b / --cookie), User Agent (-A), Referer (-e)
 * - Multiline payloads with line continuations and raw quotes
 * - Query parameter extraction
 */
export class CurlParser {
  static tokenize(curlString: string): string[] {
    const tokens: string[] = [];
    let currentToken = '';
    let inQuote: string | null = null;
    let escaped = false;

    const str = curlString.trim();

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escaped) {
        if (char === '\n' || char === '\r') {
          // Line continuation outside quotes or inside double quotes
          if (char === '\r' && i + 1 < str.length && str[i + 1] === '\n') {
            i++;
          }
        } else {
          currentToken += char;
        }
        escaped = false;
        continue;
      }

      if (char === '\\') {
        // Check for line continuation: backslash right before newline
        const nextChar = str[i + 1];
        if (nextChar === '\n' || nextChar === '\r') {
          escaped = true;
          continue;
        }
        if (inQuote === "'") {
          // In single quotes in bash, backslash is literal
          currentToken += char;
        } else {
          escaped = true;
        }
        continue;
      }

      if (inQuote !== null) {
        if (char === inQuote) {
          inQuote = null;
        } else {
          currentToken += char;
        }
        continue;
      }

      if (char === "'" || char === '"') {
        inQuote = char;
        continue;
      }

      if (/\s/.test(char)) {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = '';
        }
        continue;
      }

      currentToken += char;
    }

    if (currentToken.length > 0) {
      tokens.push(currentToken);
    }

    return tokens;
  }

  static parse(curlString: string): Request {
    const tokens = this.tokenize(curlString);

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
    let forceGet = false;
    let explicitMethod = false;

    while (i < tokens.length) {
      const token = tokens[i];

      // Ignore 'curl' prefix
      if (token.toLowerCase() === 'curl') {
        i++;
        continue;
      }

      // Check if token at index 0 or right after 'curl' is a raw HTTP Method (e.g., Postman export: POST 'https://...')
      if (!explicitMethod && HTTP_METHODS.has(token.toUpperCase())) {
        // Verify it's not an argument to a preceding flag
        const prevToken = i > 0 ? tokens[i - 1] : '';
        if (!prevToken || prevToken.toLowerCase() === 'curl' || FLAGS_WITHOUT_ARGS.has(prevToken)) {
          result.method = token.toUpperCase() as any;
          explicitMethod = true;
          i++;
          continue;
        }
      }

      // HTTP Method Flags
      if (token === '-X' || token === '--request') {
        const nextToken = tokens[i + 1];
        if (nextToken) {
          result.method = nextToken.toUpperCase() as any;
          explicitMethod = true;
        }
        i += 2;
        continue;
      }

      // Header Flags
      if (token === '-H' || token === '--header') {
        const headerRaw = tokens[i + 1];
        if (headerRaw) {
          const colonIndex = headerRaw.indexOf(':');
          if (colonIndex !== -1) {
            const key = headerRaw.substring(0, colonIndex).trim();
            const value = headerRaw.substring(colonIndex + 1).trim();
            if (key) {
              result.headers.push({ key, value, enabled: true });
            }
          }
        }
        i += 2;
        continue;
      }

      // Body Flags: -d, --data, --data-raw, --data-binary, --data-urlencode, --body, --raw
      if (
        token === '-d' ||
        token === '--data' ||
        token === '--data-raw' ||
        token === '--data-binary' ||
        token === '--data-urlencode' ||
        token === '--body' ||
        token === '--raw'
      ) {
        const bodyContent = tokens[i + 1];
        if (bodyContent !== undefined) {
          let parsedBody = bodyContent;
          let bodyType: 'raw' | 'json' = 'raw';
          try {
            const parsed = JSON.parse(bodyContent);
            parsedBody = JSON.stringify(parsed, null, 2);
            bodyType = 'json';
          } catch {
            // Keep as raw if not JSON
          }
          result.body = { type: bodyType, content: parsedBody };
          if (!explicitMethod && !forceGet) {
            result.method = 'POST';
          }
        }
        i += 2;
        continue;
      }

      // Cookie Flag
      if (token === '-b' || token === '--cookie') {
        const cookieVal = tokens[i + 1];
        if (cookieVal) {
          result.headers.push({ key: 'Cookie', value: cookieVal, enabled: true });
        }
        i += 2;
        continue;
      }

      // User Agent Flag
      if (token === '-A' || token === '--user-agent') {
        const uaVal = tokens[i + 1];
        if (uaVal) {
          result.headers.push({ key: 'User-Agent', value: uaVal, enabled: true });
        }
        i += 2;
        continue;
      }

      // Referer Flag
      if (token === '-e' || token === '--referer') {
        const refVal = tokens[i + 1];
        if (refVal) {
          result.headers.push({ key: 'Referer', value: refVal, enabled: true });
        }
        i += 2;
        continue;
      }

      // Basic Auth Flag
      if (token === '-u' || token === '--user') {
        const userVal = tokens[i + 1];
        if (userVal) {
          result.headers.push({ key: 'Authorization', value: `Basic ${toBase64(userVal)}`, enabled: true });
        }
        i += 2;
        continue;
      }

      // Explicit URL Flag
      if (token === '--url') {
        const urlVal = tokens[i + 1];
        if (urlVal) {
          const { cleanUrl, params } = extractQueryParams(urlVal);
          result.url = cleanUrl;
          result.params = params;
          const urlPath = cleanUrl.split('?')[0];
          result.name = `Imported: ${urlPath.split('/').filter(Boolean).pop() || 'Request'}`;
        }
        i += 2;
        continue;
      }

      // Force GET Flag
      if (token === '-G' || token === '--get') {
        forceGet = true;
        result.method = 'GET';
        i++;
        continue;
      }

      // Flags without arguments
      if (FLAGS_WITHOUT_ARGS.has(token)) {
        i++;
        continue;
      }

      // Skip unknown flags starting with '-'
      if (token.startsWith('-')) {
        const nextToken = tokens[i + 1];
        if (nextToken && !nextToken.startsWith('-')) {
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      // If token does not start with '-' and URL is not set yet, treat as target URL
      if (!result.url) {
        const { cleanUrl, params } = extractQueryParams(token);
        result.url = cleanUrl;
        result.params = params;
        const urlPath = cleanUrl.split('?')[0];
        result.name = `Imported: ${urlPath.split('/').filter(Boolean).pop() || 'Request'}`;
      }

      i++;
    }

    if (forceGet) {
      result.method = 'GET';
    }

    return result;
  }
}
