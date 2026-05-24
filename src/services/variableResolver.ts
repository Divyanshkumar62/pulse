import { Variable } from '../types';

interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * Resolves {{variable_name}} patterns in a given string.
 * Priority: Collection Variables -> Environment Variables
 */
export class VariableResolver {
  static resolve(
    text: string, 
    collectionVariables: Variable[] = [], 
    environmentVariables: EnvVariable[] | Variable[] = [],
    globalVariables: Variable[] = []
  ): string {
    if (!text || typeof text !== 'string') return text;

    // Combine variables, prioritizing correctly
    // Priority (High to Low): Environment > Collection > Global
    const variablesMap = new Map<string, string>();
    
    // 1. Global (Lowest priority)
    globalVariables
      .filter(v => v.enabled !== false && v.key?.trim().length > 0)
      .forEach(v => variablesMap.set(v.key, v.value));

    // 2. Collection (Medium priority)
    collectionVariables
      .filter(v => v.enabled !== false && v.key?.trim().length > 0)
      .forEach(v => variablesMap.set(v.key, v.value));

    // 3. Environment (Highest priority)
    (environmentVariables as Variable[])
      .filter(v => v.enabled !== false && v.key?.trim().length > 0)
      .forEach(v => variablesMap.set(v.key, v.value));

    // Look for {{var}}
    const regex = /\{\{([^}]+)\}\}/g;
    
    return text.replace(regex, (match, param) => {
      const key = param.trim();
      return variablesMap.has(key) ? variablesMap.get(key)! : match;
    });
  }

  /**
   * Deep resolve an object (useful for headers, form-data, etc.)
   */
  static resolveObject<T extends Record<string, any>>(
    obj: T,
    collectionVariables: Variable[] = [],
    environmentVariables: Variable[] = [],
    globalVariables: Variable[] = []
  ): T {
    if (!obj) return obj;
    
    const result = { ...obj };
    
    for (const key in result) {
      if (typeof result[key] === 'string') {
        result[key] = this.resolve(result[key] as string, collectionVariables, environmentVariables, globalVariables) as any;
      } else if (Array.isArray(result[key])) {
         result[key] = (result[key] as any[]).map(item => {
           if (typeof item === 'string') {
             return this.resolve(item, collectionVariables, environmentVariables, globalVariables);
           } else if (typeof item === 'object' && item !== null) {
             return this.resolveObject(item, collectionVariables, environmentVariables, globalVariables);
           }
           return item;
         }) as any;
      } else if (typeof result[key] === 'object' && result[key] !== null) {
         result[key] = this.resolveObject(result[key], collectionVariables, environmentVariables, globalVariables) as any;
      }
    }
    
    return result;
  }
}
