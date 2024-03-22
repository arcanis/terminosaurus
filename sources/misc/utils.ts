export function camelCase(str: string) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function identity<T>(val: T): T {
  return val;
}

export function isFinite(val: unknown): val is number {
  return typeof val === `number` && Number.isFinite(val);
}

export function isPlainObject(val: unknown): val is Record<string, any> {
  return typeof val === `object` && val !== null && val.constructor === Object;
}

export function isUndefined(val: unknown): val is undefined {
  return typeof val === `undefined`;
}

export function lowerFirst(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function mapKeys(obj: Record<string, any>, fn: (value: any, key: string) => string) {
  const result: Record<string, any> = {};

  for (const key of Object.keys(obj))
    result[fn(obj[key], key)] = obj[key];

  return result;
}
