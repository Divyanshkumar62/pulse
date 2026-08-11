export interface HeaderSuggestion {
  key: string;
  description: string;
  commonValues: string[];
}

export const COMMON_HTTP_HEADERS: HeaderSuggestion[] = [
  {
    key: 'Accept',
    description: 'Media types that are acceptable for the response',
    commonValues: [
      'application/json',
      'application/xml',
      'text/html',
      'text/plain',
      'image/png',
      'image/jpeg',
      '*/*'
    ]
  },
  {
    key: 'Accept-Charset',
    description: 'Character sets that are acceptable',
    commonValues: ['utf-8', 'iso-8859-1', 'us-ascii', '*']
  },
  {
    key: 'Accept-Encoding',
    description: 'List of acceptable encodings (compression formats)',
    commonValues: ['gzip, deflate, br', 'gzip', 'deflate', 'br', 'identity']
  },
  {
    key: 'Accept-Language',
    description: 'List of acceptable human languages',
    commonValues: ['en-US,en;q=0.9', 'en-US', 'en-GB', 'es-ES', 'fr-FR', '*']
  },
  {
    key: 'Access-Control-Request-Headers',
    description: 'Used in preflight request to indicate which headers will be used',
    commonValues: ['Content-Type, Authorization', 'Content-Type', 'Authorization', 'X-Requested-With']
  },
  {
    key: 'Access-Control-Request-Method',
    description: 'Used in preflight request to indicate which HTTP method will be used',
    commonValues: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  },
  {
    key: 'Authorization',
    description: 'Authentication credentials for HTTP authentication',
    commonValues: [
      'Bearer {{token}}',
      'Bearer ',
      'Basic {{credentials}}',
      'Basic ',
      'Digest username=""',
      'API-Key '
    ]
  },
  {
    key: 'Cache-Control',
    description: 'Directives for caching mechanisms in requests and responses',
    commonValues: [
      'no-cache',
      'no-store',
      'max-age=0',
      'must-revalidate',
      'no-transform',
      'only-if-cached'
    ]
  },
  {
    key: 'Connection',
    description: 'Controls whether the network connection stays open after current transaction',
    commonValues: ['keep-alive', 'close']
  },
  {
    key: 'Content-Disposition',
    description: 'Conveys additional information about how to process payload',
    commonValues: ['form-data; name="file"', 'attachment; filename="document.pdf"', 'inline']
  },
  {
    key: 'Content-Encoding',
    description: 'Compression algorithm applied to the payload body',
    commonValues: ['gzip', 'deflate', 'br']
  },
  {
    key: 'Content-Language',
    description: 'Describes the human language(s) intended for the audience',
    commonValues: ['en-US', 'en-GB', 'es-ES', 'fr-FR']
  },
  {
    key: 'Content-Length',
    description: 'The length of the request body in decimal number of octets',
    commonValues: ['0']
  },
  {
    key: 'Content-Type',
    description: 'The MIME type of the body of the request',
    commonValues: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'text/html',
      'application/xml',
      'application/pdf',
      'text/event-stream',
      'application/graphql+json',
      'application/octet-stream'
    ]
  },
  {
    key: 'Cookie',
    description: 'Contains stored HTTP cookies previously sent by the server',
    commonValues: ['sessionid={{sessionId}}', 'token={{token}}']
  },
  {
    key: 'Host',
    description: 'Domain name of the server and TCP port number',
    commonValues: ['localhost:3000', 'localhost:8080', 'api.example.com']
  },
  {
    key: 'If-Match',
    description: 'Makes the request conditional based on ETag matching',
    commonValues: ['*']
  },
  {
    key: 'If-Modified-Since',
    description: 'Makes the request conditional based on last modification date',
    commonValues: ['Wed, 21 Oct 2015 07:28:00 GMT']
  },
  {
    key: 'If-None-Match',
    description: 'Makes the request conditional based on ETag mismatch (caching)',
    commonValues: ['*']
  },
  {
    key: 'If-Unmodified-Since',
    description: 'Makes the request conditional based on unmodification date',
    commonValues: ['Wed, 21 Oct 2015 07:28:00 GMT']
  },
  {
    key: 'Origin',
    description: 'Indicates where a fetch originates from (CORS)',
    commonValues: ['http://localhost:3000', 'http://localhost:5173', 'https://example.com']
  },
  {
    key: 'Pragma',
    description: 'Implementation-specific directives (backward compatibility)',
    commonValues: ['no-cache']
  },
  {
    key: 'Prefer',
    description: 'Client preferences for server behavior',
    commonValues: ['return=representation', 'return=minimal', 'handling=strict']
  },
  {
    key: 'Proxy-Authorization',
    description: 'Credentials for authenticating a client to a proxy server',
    commonValues: ['Basic ']
  },
  {
    key: 'Range',
    description: 'Requests only part of an entity (bytes)',
    commonValues: ['bytes=0-1023', 'bytes=0-']
  },
  {
    key: 'Referer',
    description: 'Address of the previous web page from which a link was followed',
    commonValues: ['http://localhost:3000', 'https://example.com']
  },
  {
    key: 'Sec-Fetch-Dest',
    description: 'Indicates the request destination',
    commonValues: ['empty', 'document', 'image', 'script', 'style']
  },
  {
    key: 'Sec-Fetch-Mode',
    description: 'Indicates the request mode',
    commonValues: ['cors', 'navigate', 'no-cors', 'same-origin']
  },
  {
    key: 'Sec-Fetch-Site',
    description: 'Indicates origin relationship to target',
    commonValues: ['cross-site', 'same-origin', 'same-site', 'none']
  },
  {
    key: 'User-Agent',
    description: 'User agent string of the client sending the request',
    commonValues: [
      'Pulse/1.3.0',
      'PostmanRuntime/7.39.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'curl/7.68.0'
    ]
  },
  {
    key: 'X-Api-Key',
    description: 'Custom header used for API key authentication',
    commonValues: ['{{apiKey}}']
  },
  {
    key: 'X-Auth-Token',
    description: 'Custom header used for token authentication',
    commonValues: ['{{token}}']
  },
  {
    key: 'X-CSRF-Token',
    description: 'Anti-CSRF protection token',
    commonValues: ['{{csrfToken}}']
  },
  {
    key: 'X-Forwarded-For',
    description: 'Identifies the originating IP address of a client',
    commonValues: ['127.0.0.1', '10.0.0.1']
  },
  {
    key: 'X-Forwarded-Host',
    description: 'Identifies the original host requested by the client',
    commonValues: ['localhost:3000']
  },
  {
    key: 'X-Forwarded-Proto',
    description: 'Identifies the protocol (HTTP/HTTPS) used by the client',
    commonValues: ['https', 'http']
  },
  {
    key: 'X-Requested-With',
    description: 'Used to identify AJAX requests',
    commonValues: ['XMLHttpRequest']
  }
];

export function getHeaderKeySuggestions(input: string): { label: string; description?: string }[] {
  const lower = (input || '').toLowerCase();
  const filtered = !input
    ? COMMON_HTTP_HEADERS
    : COMMON_HTTP_HEADERS.filter(
        h => h.key.toLowerCase().includes(lower) || h.description.toLowerCase().includes(lower)
      );

  return filtered.map(h => ({
    label: h.key,
    description: h.description
  }));
}

export function getHeaderValueSuggestions(headerKey: string, input: string): { label: string; description?: string }[] {
  const found = COMMON_HTTP_HEADERS.find(
    h => h.key.toLowerCase() === (headerKey || '').trim().toLowerCase()
  );

  let candidates: string[] = [];
  if (found && found.commonValues.length > 0) {
    candidates = found.commonValues;
  } else {
    candidates = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'text/html',
      'gzip, deflate, br',
      'keep-alive',
      'no-cache',
      'utf-8'
    ];
  }

  const lower = (input || '').toLowerCase();
  const filtered = !input
    ? candidates
    : candidates.filter(v => v.toLowerCase().includes(lower));

  return filtered.map(v => ({
    label: v,
    description: found ? `Value for ${found.key}` : 'Common value'
  }));
}

export const COMMON_PARAM_KEYS: { label: string; description?: string }[] = [
  { label: 'page', description: 'Page number for pagination' },
  { label: 'limit', description: 'Maximum number of items to return' },
  { label: 'offset', description: 'Offset for pagination' },
  { label: 'query', description: 'Search term or query string' },
  { label: 'q', description: 'Search query shorthand' },
  { label: 'sort', description: 'Sorting criteria (e.g. created_at:desc)' },
  { label: 'order', description: 'Sort direction (asc/desc)' },
  { label: 'filter', description: 'Filter conditions' },
  { label: 'search', description: 'Search keyword' },
  { label: 'id', description: 'Resource identifier' },
  { label: 'api_key', description: 'API Key authentication query parameter' },
  { label: 'token', description: 'Access token' },
  { label: 'format', description: 'Response format (json/xml/csv)' },
  { label: 'fields', description: 'Specific fields to include in response' },
  { label: 'expand', description: 'Relations to expand in response' }
];

export function getParamKeySuggestions(input: string): { label: string; description?: string }[] {
  const lower = (input || '').toLowerCase();
  if (!input) return COMMON_PARAM_KEYS;
  return COMMON_PARAM_KEYS.filter(
    p => p.label.toLowerCase().includes(lower) || (p.description && p.description.toLowerCase().includes(lower))
  );
}
