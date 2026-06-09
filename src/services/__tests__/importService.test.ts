import { describe, it, expect, vi } from 'vitest';
import { ImportService } from '../importService';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd, args) => {
    if (cmd === 'import_openapi_spec') {
      return Promise.resolve({
        id: 'openapi-col',
        name: 'Swagger Petstore',
        requests: [],
        folders: []
      });
    }
    return Promise.resolve();
  })
}));

describe('ImportService', () => {
  describe('Postman v2.1 Import', () => {
    const validPostmanCollection = {
      info: {
        name: 'My Postman Collection',
        description: 'A test collection'
      },
      variable: [
        { key: 'baseUrl', value: 'https://api.test.com' }
      ],
      item: [
        {
          name: 'Root Request',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/root' },
            header: [{ key: 'X-Test', value: '123' }]
          }
        },
        {
          name: 'Folder 1',
          item: [
            {
              name: 'Nested Request',
              request: {
                method: 'POST',
                url: 'https://api.test.com/nested',
                body: {
                  mode: 'raw',
                  raw: '{"data": true}',
                  options: { raw: { language: 'json' } }
                }
              }
            }
          ]
        }
      ]
    };

    it('should parse collection metadata and variables', async () => {
      const result = await ImportService.importPostmanCollection(JSON.stringify(validPostmanCollection));
      
      expect(result.name).toBe('My Postman Collection');
      expect(result.description).toBe('A test collection');
      expect(result.variables.length).toBe(1);
      expect(result.variables[0].key).toBe('baseUrl');
      expect(result.id).toBeDefined();
    });

    it('should parse root-level requests', async () => {
      const result = await ImportService.importPostmanCollection(JSON.stringify(validPostmanCollection));
      
      expect(result.requests.length).toBe(1);
      expect(result.requests[0].name).toBe('Root Request');
      expect(result.requests[0].method).toBe('GET');
      expect(result.requests[0].url).toBe('{{baseUrl}}/root');
      expect(result.requests[0].headers[0].key).toBe('X-Test');
    });

    it('should recursively parse nested folders and requests', async () => {
      const result = await ImportService.importPostmanCollection(JSON.stringify(validPostmanCollection));
      
      expect(result.folders.length).toBe(1);
      expect(result.folders[0].name).toBe('Folder 1');
      
      const nestedReq = result.folders[0].requests[0];
      expect(nestedReq.name).toBe('Nested Request');
      expect(nestedReq.method).toBe('POST');
      expect(nestedReq.body.type).toBe('json');
      expect(nestedReq.body.content).toBe('{"data": true}');
    });

    it('should throw an error if JSON format is invalid', async () => {
      await expect(ImportService.importPostmanCollection('{"invalid": "format"}'))
        .rejects
        .toThrow('Failed to parse collection: Invalid Postman Collection Format');
    });
  });

  describe('OpenAPI Import', () => {
    it('should call backend to parse OpenAPI spec', async () => {
      const result = await ImportService.importOpenAPISpec('/path/to/swagger.yaml');
      expect(result.name).toBe('Swagger Petstore');
      expect(result.id).toBe('openapi-col');
    });
  });
});