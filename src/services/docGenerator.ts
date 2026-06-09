import { Request, HttpResponse } from '../types';
import { generateCurl, generateFetch, generatePython, generateGo } from './codeGen';

export interface CodeSnippet {
  language: string;
  code: string;
}

function generateResponseSchema(response: HttpResponse): string {
  if (!response.body) return '';
  
  try {
    const data = JSON.parse(response.body);
    let schema = `### Response Schema\n\n`;
    schema += `\`\`\`json\n`;
    
    // Simple schema inference
    const inferSchema = (obj: any, indent: string = ''): string => {
      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          return `[ ${inferSchema(obj[0], indent)} ]`;
        }
        return `[]`;
      } else if (typeof obj === 'object' && obj !== null) {
        let str = '{\n';
        for (const key in obj) {
          str += `${indent}  "${key}": ${inferSchema(obj[key], indent + '  ')},\n`;
        }
        str += `${indent}}`;
        return str;
      }
      return typeof obj;
    };

    schema += inferSchema(data);
    schema += `\n\`\`\`\n\n`;
    return schema;
  } catch {
    return '';
  }
}

export function generateDocumentation(request: Request, response?: HttpResponse): string {
  const { method, url, name, description, headers, body } = request;
  
  let markdown = `# ${name || 'Untitled Request'}\n\n`;
  
  if (description) {
    markdown += `${description}\n\n`;
  }

  markdown += `### Request Details\n`;
  markdown += `**Method**: \`${method}\`  \n`;
  markdown += `**URL**: \`${url || 'Not specified'}\`  \n\n`;

  if (headers && headers.length > 0 && headers.some(h => h.enabled !== false && h.key)) {
    markdown += `### Headers\n\n`;
    markdown += `| Key | Value | Description |\n`;
    markdown += `| :--- | :--- | :--- |\n`;
    headers.filter(h => h.enabled !== false && h.key).forEach(h => {
      markdown += `| \`${h.key}\` | \`${h.value}\` | ${h.description || '-'} |\n`;
    });
    markdown += `\n`;
  }

  if (body && body.content) {
    markdown += `### Body (\`${body.type}\`)\n\n`;
    if (body.type === 'json') {
      markdown += `\`\`\`json\n${body.content}\n\`\`\`\n\n`;
    } else {
      markdown += `\`\`\`text\n${body.content}\n\`\`\`\n\n`;
    }
  }

  if (response) {
    markdown += generateResponseSchema(response);
  }

  markdown += `### Code Snippets\n\n`;
  
  markdown += `#### cURL\n`;
  markdown += `\`\`\`bash\n${generateCurl(request)}\n\`\`\`\n\n`;
  
  markdown += `#### JavaScript (Fetch)\n`;
  markdown += `\`\`\`javascript\n${generateFetch(request)}\n\`\`\`\n\n`;

  markdown += `#### Python (Requests)\n`;
  markdown += `\`\`\`python\n${generatePython(request)}\n\`\`\`\n\n`;

  markdown += `#### Go (Native)\n`;
  markdown += `\`\`\`go\n${generateGo(request)}\n\`\`\`\n\n`;

  return markdown;
}
