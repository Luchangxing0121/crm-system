// 字段名转换：snake_case ↔ camelCase
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToCamel(item));
  }
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[toCamelCase(key)] = keysToCamel((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}

export function keysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToSnake(item));
  }
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[toSnakeCase(key)] = keysToSnake((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}
