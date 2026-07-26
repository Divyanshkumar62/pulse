import { Request, HttpResponse } from '../types';
import { generateCurl, generateFetch, generatePython, generateGo, getResolvedAuthHeaders } from './codeGen';

export function generateDocumentation(request: Request, response?: HttpResponse): string {
  const { name, description } = request;
  
  let markdown = `# ${name || 'Untitled Request'}\n\n`;
  
  if (description) {
    markdown += `${description}\n\n`;
  }

  markdown += `### cURL Request\n`;
  markdown += `\`\`\`bash\n${generateCurl(request)}\n\`\`\`\n\n`;

  if (response) {
    markdown += `### Response\n`;
    markdown += `**Status**: \`${response.status} ${response.status_text}\`  \n`;
    markdown += `**Time**: \`${response.time_ms} ms\`  \n\n`;

    if (response.body) {
      try {
        const parsed = JSON.parse(response.body);
        const formatted = JSON.stringify(parsed, null, 2);
        markdown += `\`\`\`json\n${formatted}\n\`\`\`\n`;
      } catch (e) {
        markdown += `\`\`\`text\n${response.body}\n\`\`\`\n`;
      }
    } else {
      markdown += `*No response body.*\n`;
    }
  } else {
    markdown += `### Response\n*No response recorded. Send the request to view the response.*\n`;
  }

  return markdown;
}
