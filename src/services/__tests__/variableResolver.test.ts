import { describe, it, expect } from 'vitest';
import { VariableResolver } from '../variableResolver';

describe('VariableResolver', () => {
  const globalVars = [
    { key: 'TOKEN', value: 'GlobalToken', enabled: true },
    { key: 'API_URL', value: 'https://global.com', enabled: true },
    { key: 'DISABLED_GLOBAL', value: 'ignored', enabled: false }
  ];

  const envVars = [
    { key: 'TOKEN', value: 'LocalToken', enabled: true },
    { key: 'host', value: 'google.com', enabled: true },
    { key: 'api_token', value: '12345', enabled: true },
    { key: 'username', value: 'testuser', enabled: true },
    { key: 'DISABLED_LOCAL', value: 'ignored', enabled: false }
  ];

  describe('3.1 Request Execution (Resolution)', () => {
    it('URL Resolution: should resolve {{host}} into the string', () => {
      const url = 'https://{{host}}/api';
      const resolved = VariableResolver.resolve(url, [], envVars, globalVars);
      expect(resolved).toBe('https://google.com/api');
    });

    it('Header Resolution: should resolve {{api_token}} into header strings', () => {
      const headerValue = 'Bearer {{api_token}}';
      const resolved = VariableResolver.resolve(headerValue, [], envVars, globalVars);
      expect(resolved).toBe('Bearer 12345');
    });

    it('Body Resolution: should deep resolve object properties like JSON bodies', () => {
      const body = { user: '{{username}}', id: 1 };
      const resolved = VariableResolver.resolveObject(body, [], envVars, globalVars);
      expect(resolved).toEqual({ user: 'testuser', id: 1 });
    });

    it('Body Resolution: should resolve arrays inside objects', () => {
      const body = { tags: ['{{username}}', 'static'] };
      const resolved = VariableResolver.resolveObject(body, [], envVars, globalVars);
      expect(resolved).toEqual({ tags: ['testuser', 'static'] });
    });
  });

  describe('2.2 Global Variables (Precedence)', () => {
    it('Global Precedence: Local Environment variables should override Global variables', () => {
      // TOKEN is 'GlobalToken' in globals, but 'LocalToken' in env
      const text = 'Auth: {{TOKEN}}';
      const resolved = VariableResolver.resolve(text, [], envVars, globalVars);
      expect(resolved).toBe('Auth: LocalToken');
    });

    it('Global Fallback: Should use Global if Local does not exist', () => {
      const text = 'URL: {{API_URL}}';
      const resolved = VariableResolver.resolve(text, [], envVars, globalVars);
      expect(resolved).toBe('URL: https://global.com');
    });
  });

  describe('4. Edge Cases', () => {
    it('Missing Variables: Using {{does_not_exist}} should pass the literal string', () => {
      const text = 'Result: {{does_not_exist}}';
      const resolved = VariableResolver.resolve(text, [], envVars, globalVars);
      expect(resolved).toBe('Result: {{does_not_exist}}');
    });

    it('Disabled Variables: Should ignore variables where enabled is false', () => {
      const text = '{{DISABLED_GLOBAL}} - {{DISABLED_LOCAL}}';
      const resolved = VariableResolver.resolve(text, [], envVars, globalVars);
      // Both should remain unresolved because they are disabled
      expect(resolved).toBe('{{DISABLED_GLOBAL}} - {{DISABLED_LOCAL}}');
    });

    it('Empty Input: Should handle empty strings gracefully', () => {
      expect(VariableResolver.resolve('', [], envVars, globalVars)).toBe('');
    });
  });
});