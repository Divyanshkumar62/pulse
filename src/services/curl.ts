import { Request, KeyValuePair } from '../types';
import { v4 as uuidv4 } from 'uuid';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

const PREAMBLE_WORDS = new Set(['curl', 'postman', 'request', 'req', 'call', 'api']);

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

const FLAGS_WITH_ARGS = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '--body', '--raw',
  '-b', '--cookie',
  '-A', '--user-agent',
  '-e', '--referer',
  '-u', '--user',
  '--url'
]);

export function isLikelyUrl(token: string): boolean {
  if (!token || token.startsWith('-')) return false;
  const clean = token.replace(/^['"]|['"]$/g, '').trim();

  // Explicit protocol
  if (/^(https?|wss?|sse|grpc):\/\//i.test(clean)) return true;

  // Postman/Pulse environment variable URL, e.g. {{baseUrl}}/api
  if (/^\{\{[^}]+\}\}/.test(clean)) return true;

  // Localhost, IP or host:port
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(clean)) return true;

  // Typical domain name with dot and path/TLD (e.g. stapubox.com/..., api.co/foo)
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]*(:\d+)?(\/.*)?$/.test(clean)) {
    if (clean.includes('/') || clean.includes(':') || /\.(com|org|net|io|dev|co|ai|app|in|edu|gov|xyz|biz|info)$/i.test(clean)) {
      return true;
    }
  }

  // Root-relative path with at least one slash
  if (clean.startsWith('/') && clean.length > 1) return true;

  return false;
}

function extractQueryParams(urlStr: string): { cleanUrl: string; params: KeyValuePair[] } {
  const clean = urlStr.replace(/^['"]|['"]$/g, '').trim();
  const queryIndex = clean.indexOf('?');
  if (queryIndex === -1) {
    return { cleanUrl: clean, params: [] };
  }

  const queryString = clean.substring(queryIndex + 1);
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

  return { cleanUrl: clean, params };
}

function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  return str;
}

/**
 * Enhanced cURL and Postman code snippet parser for Pulse.
 * Handles:
 * - Postman request exports with or without preambles: `postman request POST 'https://...'`
 * - Direct HTTP methods: `POST 'https://...'`
 * - Standard cURL: `curl -X POST 'https://...'`
 * - Flags: -H, --header, -d, --data, --data-raw, --body, -b, --cookie, -u, --user
 * - Automatic URL detection and query param parsing
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
          // Line continuation outside quotes
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

    // First pass to find URL if it exists
    let detectedUrl = '';
    for (let t = 0; t < tokens.length; t++) {
      const tok = tokens[t];
      const prevTok = t > 0 ? tokens[t - 1] : '';

      if (tok === '--url' && tokens[t + 1]) {
        detectedUrl = tokens[t + 1];
        break;
      }

      if (!tok.startsWith('-') && !FLAGS_WITH_ARGS.has(prevTok) && isLikelyUrl(tok)) {
        detectedUrl = tok;
        break;
      }
    }

    if (detectedUrl) {
      const { cleanUrl, params } = extractQueryParams(detectedUrl);
      result.url = cleanUrl;
      result.params = params;
      const urlPath = cleanUrl.split('?')[0];
      result.name = `Imported: ${urlPath.split('/').filter(Boolean).pop() || 'Request'}`;
    }

    while (i < tokens.length) {
      const token = tokens[i];
      const prevToken = i > 0 ? tokens[i - 1] : '';

      // Skip noise/preamble tokens like 'curl', 'postman', 'request', 'call'
      const cleanTokenWord = token.toLowerCase().replace(/[:;,]$/, '');
      if (PREAMBLE_WORDS.has(cleanTokenWord)) {
        i++;
        continue;
      }

      // Check for raw HTTP Method (e.g., 'POST' in `postman request POST 'https://...'` or `POST 'https://...'`)
      if (!explicitMethod && HTTP_METHODS.has(token.toUpperCase())) {
        if (!prevToken || !FLAGS_WITH_ARGS.has(prevToken)) {
          result.method = token.toUpperCase() as any;
          explicitMethod = true;
          i++;
          continue;
        }
      }

      // HTTP Method Flags: -X, --request
      if (token === '-X' || token === '--request') {
        const nextToken = tokens[i + 1];
        if (nextToken) {
          result.method = nextToken.toUpperCase() as any;
          explicitMethod = true;
        }
        i += 2;
        continue;
      }

      // Header Flags: -H, --header
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

      // Cookie Flag: -b, --cookie
      if (token === '-b' || token === '--cookie') {
        const cookieVal = tokens[i + 1];
        if (cookieVal) {
          result.headers.push({ key: 'Cookie', value: cookieVal, enabled: true });
        }
        i += 2;
        continue;
      }

      // User Agent Flag: -A, --user-agent
      if (token === '-A' || token === '--user-agent') {
        const uaVal = tokens[i + 1];
        if (uaVal) {
          result.headers.push({ key: 'User-Agent', value: uaVal, enabled: true });
        }
        i += 2;
        continue;
      }

      // Referer Flag: -e, --referer
      if (token === '-e' || token === '--referer') {
        const refVal = tokens[i + 1];
        if (refVal) {
          result.headers.push({ key: 'Referer', value: refVal, enabled: true });
        }
        i += 2;
        continue;
      }

      // Basic Auth Flag: -u, --user
      if (token === '-u' || token === '--user') {
        const userVal = tokens[i + 1];
        if (userVal) {
          result.headers.push({ key: 'Authorization', value: `Basic ${toBase64(userVal)}`, enabled: true });
        }
        i += 2;
        continue;
      }

      // Explicit URL Flag: --url
      if (token === '--url') {
        const urlVal = tokens[i + 1];
        if (urlVal && !result.url) {
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

      // Fallback for URL if not detected by first pass and token doesn't look like preamble
      if (!result.url && !PREAMBLE_WORDS.has(cleanTokenWord)) {
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
