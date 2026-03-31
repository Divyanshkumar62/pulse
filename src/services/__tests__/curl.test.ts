import { describe, it, expect } from 'vitest';
import { CurlParser } from '../curl';

describe('CurlParser', () => {
  it('should parse a basic GET request', () => {
    const raw = `curl https://api.example.com/v1/users`;
    const req = CurlParser.parse(raw);

    expect(req.method).toBe('GET');
    expect(req.url).toBe('https://api.example.com/v1/users');
    expect(req.headers).toEqual([]);
    expect(req.body.type).toBe('none');
  });

  it('should explicitly parse GET request with -X GET', () => {
    const raw = `curl -X GET https://api.example.com/v1/users`;
    const req = CurlParser.parse(raw);
    expect(req.method).toBe('GET');
    expect(req.url).toBe('https://api.example.com/v1/users');
  });

  it('should parse HTTP method and URL with headers', () => {
    const raw = `curl -X POST https://api.example.com/login \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer token123"`;
    
    const req = CurlParser.parse(raw);

    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.example.com/login');
    expect(req.headers).toHaveLength(2);
    expect(req.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'Content-Type', value: 'application/json' }),
        expect.objectContaining({ key: 'Authorization', value: 'Bearer token123' })
      ])
    );
  });

  it('should infer POST when -d is used without -X', () => {
    const raw = `curl https://api.example.com/submit -d '{"name":"John"}'`;
    const req = CurlParser.parse(raw);

    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.example.com/submit');
    expect(req.body.type).toBe('raw');
    expect(req.body.content).toBe('{"name":"John"}');
  });

  it('should handle complex JSON bodies with escaped quotes', () => {
    const raw = `curl -X POST https://api.example.com/data \\
      -H "Content-Type: application/json" \\
      -d '{"message": "Hello \\"world\\"", "value": 42}'`;
    
    const req = CurlParser.parse(raw);

    expect(req.method).toBe('POST');
    expect(req.body.type).toBe('raw');
    expect(req.body.content).toBe('{"message": "Hello \\"world\\"", "value": 42}');
  });

  it('should parse --data-raw and --header aliases', () => {
    const raw = `curl --request PUT "https://api.example.com/update" \\
      --header "Accept: application/json" \\
      --data-raw "{ \\"status\\": \\"ok\\" }"`;
    
    const req = CurlParser.parse(raw);

    expect(req.method).toBe('PUT');
    expect(req.url).toBe('https://api.example.com/update');
    expect(req.headers[0].key).toBe('Accept');
    expect(req.body.content).toBe('{ "status": "ok" }');
  });
});
