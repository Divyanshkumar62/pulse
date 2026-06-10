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

  it('should include request details', () => {
    const md = generateDocumentation(mockRequest);
    expect(md).toContain('**Method**: `GET`');
    expect(md).toContain('**URL**: `https://api.example.com/users/123`');
  });

  it('should include enabled headers in a markdown table', () => {
    const md = generateDocumentation(mockRequest);
    expect(md).toContain('### Headers');
    expect(md).toContain('| `Authorization` | `Bearer token` | User token |');
    expect(md).not.toContain('X-Hidden'); // Disabled header
  });

  it('should format JSON body blocks correctly', () => {
    const reqWithBody: Request = {
      ...mockRequest,
      method: 'POST',
      body: { type: 'json', content: '{\n  "key": "value"\n}' }
    };
    const md = generateDocumentation(reqWithBody);
    expect(md).toContain('### Body (`json`)');
    expect(md).toContain('```json\n{\n  "key": "value"\n}\n```');
  });

  it('should infer and append response schema if response is provided', () => {
    const md = generateDocumentation(mockRequest, mockResponse);
    expect(md).toContain('### Response Schema');
    expect(md).toContain('"id": number');
    expect(md).toContain('"name": string');
    expect(md).toContain('[ string ]'); // Array inference
  });

  it('should include code snippets at the bottom', () => {
    const md = generateDocumentation(mockRequest);
    expect(md).toContain('### Code Snippets');
    expect(md).toContain('#### cURL');
    expect(md).toContain('#### JavaScript (Fetch)');
    expect(md).toContain('#### Python (Requests)');
    expect(md).toContain('#### Go (Native)');
  });
});
