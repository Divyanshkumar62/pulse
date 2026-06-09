import { describe, it, expect } from 'vitest';
import { CurlParser } from '../curl';

describe('CurlParser', () => {
  it('should parse a basic GET request', () => {
    const curl = 'curl https://api.example.com/users';
    const request = CurlParser.parse(curl);

    expect(request.url).toBe('https://api.example.com/users');
    expect(request.method).toBe('GET');
    expect(request.headers.length).toBe(0);
    expect(request.body.type).toBe('none');
    expect(request.name).toBe('Imported: users');
  });

  it('should parse HTTP methods using -X', () => {
    const curl = 'curl -X DELETE https://api.example.com/users/123';
    const request = CurlParser.parse(curl);

    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://api.example.com/users/123');
  });

  it('should parse headers using -H', () => {
    const curl = 'curl -H "Content-Type: application/json" -H "Authorization: Bearer token123" https://api.example.com/data';
    const request = CurlParser.parse(curl);

    expect(request.headers.length).toBe(2);
    expect(request.headers[0]).toEqual({ key: 'Content-Type', value: 'application/json', enabled: true });
    expect(request.headers[1]).toEqual({ key: 'Authorization', value: 'Bearer token123', enabled: true });
  });

  it('should parse request body using -d and auto-set method to POST', () => {
    const curl = "curl -d '{\"name\":\"John\"}' https://api.example.com/users";
    const request = CurlParser.parse(curl);

    expect(request.method).toBe('POST'); // Should default to POST when data is provided
    expect(request.body.type).toBe('raw');
    expect(request.body.content).toBe('{"name":"John"}');
  });

  it('should parse multiline cURL commands with escaped line endings', () => {
    const curl = `curl -X POST \\
      https://api.example.com/graphql \\
      -H 'Content-Type: application/json' \\
      -d '{"query":"query { users { id } }"}'`;
    
    const request = CurlParser.parse(curl);

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.example.com/graphql');
    expect(request.headers.length).toBe(1);
    expect(request.headers[0]).toEqual({ key: 'Content-Type', value: 'application/json', enabled: true });
    expect(request.body.type).toBe('raw');
    expect(request.body.content).toBe('{"query":"query { users { id } }"}');
  });

  it('should respect -G / --get to force GET method even with data', () => {
    const curl = "curl -G -d 'query=test' https://api.example.com/search";
    const request = CurlParser.parse(curl);

    expect(request.method).toBe('GET');
    expect(request.body.content).toBe('query=test');
  });
});
