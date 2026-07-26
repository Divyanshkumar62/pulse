import { describe, it, expect } from 'vitest';
import { generateDocumentation } from '../docGenerator';
import { Request, HttpResponse } from '../../types';

describe('Document Generator Service', () => {
  const mockRequest: Request = {
    id: 'req-1',
    name: 'Get User Data',
    description: 'Fetches user details by ID.',
    method: 'GET',
    url: 'https://api.example.com/users/123',
    headers: [
      { key: 'Authorization', value: 'Bearer token', description: 'User token', enabled: true },
      { key: 'X-Hidden', value: 'secret', enabled: false }
    ],
    body: { type: 'none', content: '' },
    collectionId: 'col-1'
  };

  const mockResponse: HttpResponse = {
    status: 200,
    status_text: 'OK',
    time_ms: 45,
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      id: 123,
      name: "John Doe",
      roles: ["admin", "user"]
    })
  };

  it('should generate a markdown title and description', () => {
    const md = generateDocumentation(mockRequest);
    expect(md).toContain('# Get User Data');
    expect(md).toContain('Fetches user details by ID.');
  });

  it('should include cURL request code snippet', () => {
    const md = generateDocumentation(mockRequest);
    expect(md).toContain('### cURL Request');
    expect(md).toContain('```bash\ncurl -X GET "https://api.example.com/users/123"');
  });

  it('should include response status, time and body if response is provided', () => {
    const md = generateDocumentation(mockRequest, mockResponse);
    expect(md).toContain('### Response');
    expect(md).toContain('**Status**: `200 OK`');
    expect(md).toContain('**Time**: `45 ms`');
    expect(md).toContain('```json');
    expect(md).toContain('"name": "John Doe"');
  });

  it('should handle fallback when no response is provided', () => {
    const md = generateDocumentation(mockRequest);
    expect(md).toContain('### Response\n*No response recorded. Send the request to view the response.*');
  });
});
