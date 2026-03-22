import { Request } from '../types';

export function generateCurl(request: Request): string {
  if (!request.url) return 'Please enter a URL first.';
  
  let cmd = `curl -X ${request.method} "${request.url}"`;
  
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
    });
  }
  
  if (request.body) {
    // Escape single quotes safely for bash
    const escapedBody = request.body.replace(/'/g, "'\\''");
    cmd += ` \\\n  -d '${escapedBody}'`;
  }
  
  return cmd;
}

export function generateFetch(request: Request): string {
  if (!request.url) return '// Please enter a URL first.';

  const headersStr = (request.headers || [])
    .filter(h => h.enabled !== false && h.key)
    .map(h => `    "${h.key}": "${h.value.replace(/"/g, '\\"')}"`)
    .join(',\n');

  let code = `const options = {\n  method: '${request.method}'`;
  
  if (headersStr) {
    code += `,\n  headers: {\n${headersStr}\n  }`;
  }
  
  if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
    // Determine if it looks like raw json so we can parse it beautifully, or pass as string
    let isJson = false;
    try {
      JSON.parse(request.body);
      isJson = true;
    } catch (e) {
      isJson = false;
    }
    
    if (isJson) {
      code += `,\n  body: JSON.stringify(${request.body})`;
    } else {
      code += `,\n  body: ${JSON.stringify(request.body)}`;
    }
  }
  
  code += `\n};\n\nfetch('${request.url}', options)\n  .then(response => response.json())\n  .then(response => console.log(response))\n  .catch(err => console.error(err));`;
  return code;
}
