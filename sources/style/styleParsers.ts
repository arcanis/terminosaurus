import {isFinite, isUndefined} from 'lodash';
import {style}                 from 'term-strings';

import {StyleValues}           from '#sources/style/StyleValues';
import {colorNames}            from '#sources/style/colorNames.json';
import {Parser, parseRawValue} from '#sources/style/tools/parseRawValue';

export type ParserType<T> =
  | T extends Array<infer Parser>
    ? ParserType<Parser>
    : T extends Record<string, infer Value>
      ? Value
      : T extends Optional<infer Parser, infer Default>
        ? ParserType<Parser> | Default
        : T extends (...args: Array<any>) => infer ReturnValue
          ? ReturnValue
          : T extends Map<unknown, infer Value>
            ? Value
            : T extends true
              ? true
              : T extends null
                ? null
                : unknown;

export type ParserInput<T> =
  | T extends (arg: infer Arg) => any
    ? Arg
    : T extends true
      ? true
      : T extends null
        ? null
        : T extends Array<infer Parser>
          ? ParserInput<Parser>
          : T extends Record<infer Key, any>
            ? Key
            : T extends Optional<infer Parser, any>
              ? ParserInput<Parser> | undefined
              : T extends Map<infer Key, any>
                ? Key
                : unknown;

export class Optional<T, TDefault> {
  constructor(public parser: T, public defaultValue: ParserType<T> | TDefault) {
  }
}

type ExcludeFromTuple<T extends ReadonlyArray<any>, E> =
    T extends [infer F, ...infer R] ? [F] extends [E] ? ExcludeFromTuple<R, E> :
      [F, ...ExcludeFromTuple<R, E>] : [];

type ExcludeOptional<T extends ReadonlyArray<any>> =
    ExcludeFromTuple<T, Optional<any, any>>[`length`] extends 1
      ? ParserInput<ExcludeFromTuple<T, Optional<any, any>>[0]>
      : never;

export function list<T extends Array<Parser>>(parserList: [...T]) {
  const minSize = parserList.reduce((count, parser) => count + ((parser as any) instanceof Optional ? 0 : 1), 0);
  const maxSize = parserList.length;

  function iterate(parserList: any, rawValues: Array<unknown>): any {
    if (rawValues.length === 0 && parserList.length === 0)
      return [];

    if (rawValues.length < minSize && parserList.length === 0)
      return undefined;

    if (parserList.length < minSize && rawValues.length === 0)
      return undefined;

    const rawValue = rawValues[0];
    const parserEntry = parserList[0];

    const isOptional = parserEntry instanceof Optional;
    const parser = parserEntry instanceof Optional
      ? parserEntry.parser
      : parserEntry;

    const value = parseRawValue(rawValue, parser);
    if (value === undefined && !isOptional)
      return undefined;

    const next = value !== undefined
      ? iterate(parserList.slice(1), rawValues.slice(1))
      : iterate(parserList.slice(1), rawValues);

    if (next !== undefined) {
      return [value, ...next];
    } else {
      return undefined;
    }
  }

  return (rawValue: ExcludeOptional<T> | {[K in keyof T]: ParserInput<T[K]>}): {[K in keyof T]: ParserType<T[K]>} | undefined => {
    const asArray = Array.isArray(rawValue)
      ? rawValue
      : [rawValue];

    if (asArray.length < minSize)
      return undefined;

    if (asArray.length > maxSize)
      return undefined;

    return iterate(parserList, asArray);
  };
}

export function optional<T extends Parser, TDefault>(parser: T, defaultValue: ParserType<T> | TDefault) {
  return new Optional(parser, defaultValue);
}

type Tuple<T, N, R extends Array<T> = []> = R['length'] extends N ? R : Tuple<T, N, [...R, T]>;

export function repeat<N extends Array<number>, T extends Parser>(n: [...N], parser: T) {
  return (rawValue: {[K in keyof N as K extends 0 ? K : never]?: Tuple<ParserInput<T>, N[K]>} | {[K in keyof N]: Tuple<ParserInput<T>, N[K]>}): {[K in keyof N]: Tuple<ParserType<T>, N[K]>}[number] | undefined => {
    const asArray = Array.isArray(rawValue)
      ? rawValue
      : [rawValue];

    if (!n.includes(asArray.length))
      return undefined;

    const value = asArray.map(sub => {
      return parseRawValue(sub, parser);
    });

    if (value.some(sub => isUndefined(sub)))
      return undefined;

    return value as any;
  };
}

export function number(rawValue: string | number) {
  if (typeof rawValue === `string`)
    rawValue = parseInt(rawValue, 10);

  if (typeof rawValue === `number`)
    return isFinite(rawValue) ? rawValue : undefined;

  return undefined;
}

export function length(rawValue: string | number) {
  const value = number(rawValue);
  if (typeof value !== `undefined`)
    return {value, isRelative: false, yoga: value};

  return undefined;
}

length.rel = (rawValue: string) => {
  if (typeof rawValue !== `string` || !rawValue.endsWith(`%`))
    return undefined;

  const value = parseInt(rawValue.slice(0, -1), 10);
  if (isFinite(value))
    return {value, isRelative: true, yoga: `${value}%`};

  return undefined;
};

length.autoNaN = (rawValue: `auto`) => {
  if (rawValue === `auto`)
    return StyleValues.Length.AutoNaN;

  return undefined;
};

length.auto = (rawValue: `auto`) => {
  if (rawValue === `auto`)
    return StyleValues.Length.Auto;

  return undefined;
};

length.infinity = (rawValue: number) => {
  if (rawValue === Infinity)
    return StyleValues.Length.Infinity;

  return undefined;
};

export function inherit(rawValue: `inherit`) {
  if (rawValue === `inherit`)
    return StyleValues.Inherit;

  return undefined;
}

export function character(rawValue: string) {
  if (typeof rawValue === `string` && rawValue.length === 1)
    return rawValue;

  return undefined;
}

const colorCache = new Map<string, {
  front: string;
  back: string;
}>();

export function color(rawValue: keyof typeof colorNames | string) {
  if (typeof rawValue !== `string`)
    return undefined;

  const lcValue = rawValue.toLowerCase();

  const expandedColor = Object.prototype.hasOwnProperty.call(colorNames, lcValue)
    ? colorNames[lcValue as keyof typeof colorNames]
    : lcValue;

  const hexColor = /^#[0-9a-f]{3}$/.test(expandedColor)
    ? expandedColor.replace(/([0-9a-f])/g, `$1$1`)
    : expandedColor;

  if (!/^#[0-9a-f]{6}$/.test(hexColor))
    return undefined;

  let cacheEntry = colorCache.get(hexColor);
  if (typeof cacheEntry === `undefined`)
    colorCache.set(hexColor, cacheEntry = {front: style.color.front(hexColor), back: style.color.back(hexColor)});

  return cacheEntry;
}
