import { describe, it, expect } from 'vitest';
import { generateCurl, generateFetch, generatePython, generateGo, generateJava } from '../codeGen';
import { Request } from '../../types';

describe('Code Generation Service', () => {
  const baseRequest: Request = {
    id: 'req-1',
    name: 'Test Request',
    method: 'GET',
    url: 'https://api.example.com/data',
    headers: [],
    body: { type: 'none', content: '' },
    collectionId: 'col-1'
  };

  const complexRequest: Request = {
    id: 'req-2',
    name: 'Complex POST',
    method: 'POST',
    url: 'https://api.example.com/submit',
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Authorization', value: 'Bearer token123', enabled: true },
      { key: 'X-Disabled', value: 'ignored', enabled: false }
    ],
    body: { type: 'raw', content: '{"user": "test", "active": true}' },
    collectionId: 'col-1'
  };

  describe('generateCurl', () => {
    it('should generate basic GET curl', () => {
      const result = generateCurl(baseRequest);
      expect(result).toBe('curl -X GET "https://api.example.com/data"');
    });

    it('should generate complex POST curl with headers and body', () => {
      const result = generateCurl(complexRequest);
      expect(result).toContain('curl -X POST "https://api.example.com/submit"');
      expect(result).toContain('-H "Content-Type: application/json"');
      expect(result).toContain('-H "Authorization: Bearer token123"');
      expect(result).not.toContain('X-Disabled');
      expect(result).toContain('-d \'{"user": "test", "active": true}\'');
    });

    it('should safely escape single quotes in body', () => {
      const req = { ...complexRequest, body: { type: 'raw' as any, content: "It's a test" } };
      const result = generateCurl(req);
      expect(result).toContain(`-d 'It'\\''s a test'`);
    });
  });

  describe('generateFetch', () => {
    it('should generate basic fetch', () => {
      const result = generateFetch(baseRequest);
      expect(result).toContain("method: 'GET'");
      expect(result).not.toContain('headers:');
      expect(result).not.toContain('body:');
      expect(result).toContain("fetch('https://api.example.com/data', options)");
    });

    it('should generate fetch with headers and body', () => {
      const result = generateFetch(complexRequest);
      expect(result).toContain('"Content-Type": "application/json"');
      expect(result).not.toContain('X-Disabled');
      expect(result).toContain('body: JSON.stringify("{\\"user\\": \\"test\\", \\"active\\": true}")');
    });
  });

  describe('generatePython', () => {
    it('should generate basic requests snippet', () => {
      const result = generatePython(baseRequest);
      expect(result).toContain('import requests');
      expect(result).toContain('url = "https://api.example.com/data"');
      expect(result).toContain('headers = {}');
      expect(result).toContain('requests.request("GET", url, headers=headers)');
    });

    it('should generate python requests with headers and json payload', () => {
      const result = generatePython(complexRequest);
      expect(result).toContain('"Content-Type": "application/json"');
      expect(result).toContain('json={"user": "test", "active": true}');
    });
  });

  describe('generateGo', () => {
    it('should generate Go snippet with headers and body', () => {
      const result = generateGo(complexRequest);
      expect(result).toContain('package main');
      expect(result).toContain('url := "https://api.example.com/submit"');
      expect(result).toContain('payload := strings.NewReader(`{"user": "test", "active": true}`)');
      expect(result).toContain('req.Header.Add("Content-Type", "application/json")');
    });
  });

  describe('generateJava', () => {
    it('should generate Java HttpClient snippet', () => {
      const result = generateJava(complexRequest);
      expect(result).toContain('import java.net.http.HttpClient;');
      expect(result).toContain('.uri(URI.create("https://api.example.com/submit"))');
      expect(result).toContain('.method("POST"');
      expect(result).toContain('builder.header("Authorization", "Bearer token123");');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing URL', () => {
      const emptyReq = { ...baseRequest, url: '' };
      expect(generateCurl(emptyReq)).toBe('Please enter a URL first.');
      expect(generateFetch(emptyReq)).toBe('// Please enter a URL first.');
      expect(generatePython(emptyReq)).toBe('# Please enter a URL first.');
      expect(generateGo(emptyReq)).toBe('// Please enter a URL first.');
      expect(generateJava(emptyReq)).toBe('// Please enter a URL first.');
    });
  });
});
