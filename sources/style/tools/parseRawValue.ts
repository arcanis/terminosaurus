import {camelCase, isPlainObject} from 'lodash';

import {ParserType}               from '#sources/style/styleParsers';

export type Parser =
    | Array<Parser>
    | ((rawValue: any) => any | undefined)
    | Record<string, any>
    | Map<unknown, any>
    | any;

export function parseRawValue<T extends Parser>(rawValue: unknown, parser: T): ParserType<T> | undefined {
  if (parser === rawValue)
    return rawValue as any;

  if (parser instanceof Map)
    return parser.get(rawValue);

  if (Array.isArray(parser)) {
    let value;

    for (let t = 0; typeof value === `undefined` && t < parser.length; ++t)
      value = parseRawValue(rawValue, parser[t]);

    return value as any;
  }

  if (typeof parser === `function`)
    return parser(rawValue);

  if (isPlainObject(parser)) {
    if (typeof rawValue !== `string`)
      return undefined;

    const asCamel = camelCase(rawValue);
    if (Object.prototype.hasOwnProperty.call(parser, asCamel)) {
      return parser[asCamel as keyof typeof parser] as any;
    } else {
      return undefined;
    }
  }

  return undefined;
}
