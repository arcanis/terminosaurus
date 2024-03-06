export function serializePropertyValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map((sub: unknown) => serializePropertyValue(sub));

  if (typeof value === `object` && value !== null && `serialize` in value)
  // @ts-expect-error
    return value.serialize();

  return value;
}
