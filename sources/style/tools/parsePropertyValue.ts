import {PropertyName, PropertyInput, PropertyType, styleParsers} from '../styleProperties';

import {parseRawValue}                                           from './parseRawValue';

export function parsePropertyValue<T extends PropertyName>(propertyName: PropertyName, rawValue: PropertyInput<T>): PropertyType<T> {
  const styleValue = parseRawValue(rawValue, styleParsers[propertyName]);
  if (typeof styleValue === `undefined`)
    throw new Error(`Failed to parse a style property: '${String(rawValue)}' is not a valid value for property '${propertyName}'.`);

  return styleValue as any;
}
