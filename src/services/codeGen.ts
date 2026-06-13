import { Request } from '../types';
import { useEnvStore } from '../stores/useEnvStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useGlobalStore } from '../stores/useGlobalStore';
import { VariableResolver } from './variableResolver';

export function getResolvedAuthHeaders(request: Request): Record<string, string> {
  const auth = request.auth;
  if (!auth || auth.type === 'none') return {};

  let effectiveAuth = auth;
  if (auth.type === 'inherit') {
    const collections = useCollectionStore.getState().collections;
    const inheritanceChain: any[] = [];
    const activeCollection = collections.find(c => {
      const findParentFolders = (folders: any[], targetId: string, currentPath: any[]): boolean => {
        for (const f of folders) {
          if (f.requests.some((r: any) => r.id === targetId)) {
            inheritanceChain.push(...currentPath, f);
            return true;
          }
          if (f.folders && findParentFolders(f.folders, targetId, [...currentPath, f])) return true;
        }
        return false;
      };
      
      if (c.requests.some(r => r.id === request.id)) {
        return true;
      }
      return findParentFolders(c.folders, request.id, []);
    });

    if (activeCollection) {
      inheritanceChain.unshift(activeCollection);
      for (let i = inheritanceChain.length - 1; i >= 0; i--) {
        if (inheritanceChain[i].auth && inheritanceChain[i].auth.type !== 'inherit') {
          effectiveAuth = inheritanceChain[i].auth;
          break;
        }
      }
    }
  }

  if (!effectiveAuth || effectiveAuth.type === 'none' || effectiveAuth.type === 'inherit') {
    return {};
  }

  const activeEnvId = useEnvStore.getState().activeEnvId;
  const activeEnv = useEnvStore.getState().environments.find(e => e.id === activeEnvId);
  const collections = useCollectionStore.getState().collections;
  
  const activeCollection = collections.find(c => {
    const checkFolders = (folders: any[]): boolean => {
      for (const f of folders) {
        if (f.requests.some((r: any) => r.id === request.id)) return true;
        if (f.folders && checkFolders(f.folders)) return true;
      }
      return false;
    };
    return c.requests.some(r => r.id === request.id) || checkFolders(c.folders);
  });

  const envVars = activeEnv?.variables?.filter(v => v.enabled !== false && v.key) || [];
  const collectionVars = activeCollection?.variables?.filter(v => v.enabled !== false && v.key) || [];
  const globalVariables = useGlobalStore.getState().globalVariables.filter(v => v.enabled !== false && v.key) || [];

  const resolveVal = (val: string) => {
    return VariableResolver.resolve(val, collectionVars, envVars, globalVariables);
  };

  const headers: Record<string, string> = {};
  if (effectiveAuth.type === 'bearer' && effectiveAuth.config?.token) {
    headers['Authorization'] = `Bearer ${resolveVal(effectiveAuth.config.token)}`;
  } else if (effectiveAuth.type === 'oauth2' && effectiveAuth.config?.accessToken) {
    headers['Authorization'] = `Bearer ${resolveVal(effectiveAuth.config.accessToken)}`;
  } else if (effectiveAuth.type === 'basic' && effectiveAuth.config?.username) {
    const credentials = btoa(`${resolveVal(effectiveAuth.config.username)}:${resolveVal(effectiveAuth.config.password || '')}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  return headers;
}


export function generateCurl(request: Request): string {
  if (!request.url) return 'Please enter a URL first.';
  
  let cmd = `curl -X ${request.method} "${request.url}"`;
  
  const authHeaders = getResolvedAuthHeaders(request);
  const allHeaders: Record<string, string> = { ...authHeaders };
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      allHeaders[h.key] = h.value;
    });
  }

  Object.entries(allHeaders).forEach(([key, value]) => {
    cmd += ` \\\n  -H "${key}: ${value}"`;
  });
  
if (request.body && request.body.type !== 'none' && request.body.content && request.method !== 'GET' && request.method !== 'HEAD') {
     // Escape single quotes safely for bash
     const escapedBody = request.body.content.replace(/'/g, "'\\''");
     cmd += ` \\\n  -d '${escapedBody}'`;
   }
  
  return cmd;
}

export function generateFetch(request: Request): string {
  if (!request.url) return '// Please enter a URL first.';

  const authHeaders = getResolvedAuthHeaders(request);
  const headersObj: Record<string, string> = { ...authHeaders };
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      headersObj[h.key] = h.value;
    });
  }

  const headersStr = Object.entries(headersObj)
    .map(([key, value]) => `    "${key}": "${value.replace(/"/g, '\\"')}"`)
    .join(',\n');

  let code = `const options = {\n  method: '${request.method}'`;
  
  if (headersStr) {
    code += `,\n  headers: {\n${headersStr}\n  }`;
  }
  
  if (request.body && request.body.type !== 'none' && request.method !== 'GET' && request.method !== 'HEAD') {
// Determine if it looks like raw json so we can parse it beautifully, or pass as string
     let isJson = false;
     try {
       JSON.parse(request.body.content);
       isJson = true;
     } catch (e) {
       isJson = false;
     }
     
     if (isJson) {
       code += `,\n  body: JSON.stringify(${JSON.stringify(request.body.content)})`;
     } else {
       code += `,\n  body: ${JSON.stringify(request.body.content)}`;
     }
  }
  
  code += `\n};\n\nfetch('${request.url}', options)\n  .then(response => response.json())\n  .then(response => console.log(response))\n  .catch(err => console.error(err));`;
  return code;
}

export function generatePython(request: Request): string {
  if (!request.url) return '# Please enter a URL first.';

  let code = `import requests\n\nurl = "${request.url}"\n`;
  
  const authHeaders = getResolvedAuthHeaders(request);
  const headers: Record<string, string> = { ...authHeaders };
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      headers[h.key] = h.value;
    });
  }

  if (Object.keys(headers).length > 0) {
    code += `headers = ${JSON.stringify(headers, null, 4)}\n`;
  } else {
    code += `headers = {}\n`;
  }

  const method = request.method.toLowerCase();
  let payload = '';
  
  if (request.body && request.body.type !== 'none' && request.body.content && method !== 'get' && method !== 'head') {
    try {
      JSON.parse(request.body.content);
      payload = `, json=${request.body.content}`;
    } catch (e) {
      payload = `, data=${JSON.stringify(request.body.content)}`;
    }
  }

  code += `\nresponse = requests.request("${request.method}", url, headers=headers${payload})\n\nprint(response.text)`;
  return code;
}

export function generateGo(request: Request): string {
  if (!request.url) return '// Please enter a URL first.';

  let code = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n\t"strings"\n)\n\nfunc main() {\n`;
  code += `\turl := "${request.url}"\n`;
  code += `\tmethod := "${request.method}"\n\n`;

  if (request.body && request.body.type !== 'none' && request.body.content && request.method !== "GET" && request.method !== "HEAD") {
    code += `\tpayload := strings.NewReader(\`${request.body.content}\`)\n`;
  } else {
    code += `\tpayload := nil\n`;
  }

  code += `\n\tclient := &http.Client{}\n`;
  code += `\treq, err := http.NewRequest(method, url, payload)\n`;
  code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`;

  const authHeaders = getResolvedAuthHeaders(request);
  const headersObj: Record<string, string> = { ...authHeaders };
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      headersObj[h.key] = h.value;
    });
  }

  Object.entries(headersObj).forEach(([key, value]) => {
    code += `\treq.Header.Add("${key}", "${value}")\n`;
  });

  code += `\n\tres, err := client.Do(req)\n`;
  code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`;
  code += `\tdefer res.Body.Close()\n\n`;
  code += `\tbody, err := io.ReadAll(res.Body)\n`;
  code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`;
  code += `\tfmt.Println(string(body))\n}`;
  
  return code;
}

export function generateJava(request: Request): string {
  if (!request.url) return '// Please enter a URL first.';

  let code = `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create("${request.url}"))
            .method("${request.method}", `;
            
  if (request.body && request.body.type !== 'none' && request.body.content && request.method !== "GET" && request.method !== "HEAD") {
      const escapedBody = request.body.content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      code += `HttpRequest.BodyPublishers.ofString("${escapedBody}")`;
  } else {
      code += `HttpRequest.BodyPublishers.noBody()`;
  }
  code += `);\n\n`;

  const authHeaders = getResolvedAuthHeaders(request);
  const headersObj: Record<string, string> = { ...authHeaders };
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      headersObj[h.key] = h.value;
    });
  }

  Object.entries(headersObj).forEach(([key, value]) => {
    code += `        builder.header("${key}", "${value}");\n`;
  });

  code += `
        HttpRequest request = builder.build();
        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
`;
  return code;
}
