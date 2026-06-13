import { Request } from '../types';

export function generateCurl(request: Request): string {
  if (!request.url) return 'Please enter a URL first.';
  
  let cmd = `curl -X ${request.method} "${request.url}"`;
  
  if (request.headers) {
    request.headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
    });
  }
  
if (request.body && request.body.type !== 'none' && request.body.content && request.method !== 'GET' && request.method !== 'HEAD') {
     // Escape single quotes safely for bash
     const escapedBody = request.body.content.replace(/'/g, "'\\''");
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
  
  const headers = (request.headers || [])
    .filter(h => h.enabled !== false && h.key)
    .reduce((acc, h) => {
      acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);

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

  (request.headers || []).filter(h => h.enabled !== false && h.key).forEach(h => {
    code += `\treq.Header.Add("${h.key}", "${h.value}")\n`;
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

  (request.headers || []).filter(h => h.enabled !== false && h.key).forEach(h => {
    code += `        builder.header("${h.key}", "${h.value}");\n`;
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
