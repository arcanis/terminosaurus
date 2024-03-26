import Yoga                                                                                                              from 'yogini';

import {identity, lowerFirst, mapKeys}                                                                                   from '#sources/misc/utils';
import {StyleValues}                                                                                                     from '#sources/style/StyleValues';
import {repeat, length, character, color, number, list, optional, inherit, ParserInput, ParserType}                      from '#sources/style/styleParsers';
import {dirtyLayout, dirtyClipping, dirtyRendering, dirtyRenderList, dirtyFocusList, forwardToYoga, forwardToTextLayout} from '#sources/style/styleTriggers';
import {onNullSwitch}                                                                                                    from '#sources/style/styleTriggers';

const simple  = [`+`, `+`, `+`, `+`, `-`, `|`];
const modern  = [`┌`, `┐`, `└`, `┘`, `─`, `│`];
const strong  = [`┏`, `┓`, `┗`, `┛`, `━`, `┃`];
const double  = [`╔`, `╗`, `╚`, `╝`, `═`, `║`];
const block   = [`▄`, `▄`, `▀`, `▀`, `▄`, `█`, `▀`, `█`];
const rounded = [`╭`, `╮`, `╰`, `╯`, `─`, `│`];

function pick<T extends Record<string, any>>(obj: T): {[K in Extract<keyof T, string> as Uncapitalize<K>]: T[K]} {
  return mapKeys(obj, (v, k) => lowerFirst(k)) as any;
}

export type PropertyName = keyof typeof styleParsers;

export type PropertyParser<T extends PropertyName> = (typeof styleParsers)[T];
export type PropertyInput<T extends PropertyName> = ParserInput<PropertyParser<T>>;
export type PropertyType<T extends PropertyName> = ParserType<PropertyParser<T>>;
export type PropertySpec<T extends PhysicalPropertyName> = (typeof physicalProperties)[T];

export type AllPropertiesInputs = {
  [K in PropertyName]: PropertyInput<K>;
};

export type PhysicalPropertyTypes = {
  [K in PhysicalPropertyName]: PropertyType<K>;
};

export type AllPropertiesTypes = {
  [K in PropertyName]: PropertyType<K>;
};

export type AllComputedStyles = {
  [K in PhysicalPropertyName]:
  | (Exclude<PropertyType<K>, typeof StyleValues.Inherit | undefined>)
  | (PropertySpec<K> extends {"default": infer TDefault} ? TDefault : never);
};

export type PhysicalPropertyName = keyof typeof physicalProperties;
export type CompoundPropertyName = Exclude<PropertyName, PhysicalPropertyName>;
export type DefaultInheritPropertyName = keyof {[K in PhysicalPropertyName as (typeof physicalProperties)[K][`initial`] extends typeof StyleValues.Inherit ? K : never]: any};

const tuple = <T extends Array<any>>(values: [...T]) => values;

export const styleParsers = {
  display: tuple([pick(StyleValues.Display), null, inherit]),

  alignContent: tuple([pick(StyleValues.FlexAlign), inherit]),
  alignItems: tuple([pick(StyleValues.FlexAlign), inherit]),
  alignSelf: tuple([pick(StyleValues.FlexAlign), inherit]),
  flexDirection: tuple([pick(StyleValues.FlexDirection), inherit]),

  position: tuple([pick(StyleValues.Position), inherit]),

  inset: tuple([repeat([1, 2], [length.rel, length, length.autoNaN, inherit])]),
  insetX: tuple([length.rel, length, length.autoNaN, inherit]),
  insetY: tuple([length.rel, length, length.autoNaN, inherit]),
  left: tuple([length.rel, length, length.autoNaN, inherit]),
  right: tuple([length.rel, length, length.autoNaN, inherit]),
  top: tuple([length.rel, length, length.autoNaN, inherit]),
  bottom: tuple([length.rel, length, length.autoNaN, inherit]),
  zIndex: tuple([number, null, inherit]),

  margin: tuple([repeat([1, 2, 4], [length.rel, length, length.auto]), inherit]),
  marginLeft: tuple([length.rel, length, length.auto, inherit]),
  marginRight: tuple([length.rel, length, length.auto, inherit]),
  marginTop: tuple([length.rel, length, length.auto, inherit]),
  marginBottom: tuple([length.rel, length, length.auto, inherit]),

  flex: tuple([list([number, optional(number, 0), optional([length.rel, length, length.autoNaN], StyleValues.Length.AutoNaN)]), list([optional(number, 0), optional(number, 0), [length.rel, length, length.autoNaN]]), new Map([[null, tuple([0, 0, StyleValues.Length.AutoNaN])]]), inherit]),
  flexGrow: tuple([number, inherit]),
  flexShrink: tuple([number, inherit]),
  flexBasis: tuple([length.rel, length, length.autoNaN, inherit]),

  width: tuple([length.rel, length, length.autoNaN, inherit]),
  height: tuple([length.rel, length, length.autoNaN, inherit]),

  minWidth: tuple([length.rel, length, inherit]),
  minHeight: tuple([length.rel, length, length.autoNaN, inherit]),

  maxWidth: tuple([length.rel, length, length.infinity, inherit]),
  maxHeight: tuple([length.rel, length, length.infinity, inherit]),

  overflow: tuple([pick(StyleValues.Overflow), inherit]),

  border: tuple([{simple, modern, strong, double, block, rounded}, repeat([1, 2, 4, 5, 8], [character, null]), inherit]),
  borderCharacter: tuple([{simple, modern, strong, double, block, rounded}, repeat([5, 6, 8], [character, null]), inherit]),

  borderLeftCharacter: tuple([character, null, inherit]),
  borderRightCharacter: tuple([character, null, inherit]),
  borderTopCharacter: tuple([character, null, inherit]),
  borderBottomCharacter: tuple([character, null, inherit]),
  borderTopLeftCharacter: tuple([character, null, inherit]),
  borderTopRightCharacter: tuple([character, null, inherit]),
  borderBottomLeftCharacter: tuple([character, null, inherit]),
  borderBottomRightCharacter: tuple([character, null, inherit]),

  padding: tuple([repeat([1, 2, 4], [length.rel, length]), inherit]),
  paddingLeft: tuple([length.rel, length, inherit]),
  paddingRight: tuple([length.rel, length, inherit]),
  paddingTop: tuple([length.rel, length, inherit]),
  paddingBottom: tuple([length.rel, length, inherit]),

  fontWeight: tuple([pick(StyleValues.FontWeight), inherit]),
  textAlign: tuple([pick(StyleValues.TextAlign), inherit]),
  textDecoration: tuple([pick(StyleValues.TextDecoration), null, inherit]),
  whiteSpace: tuple([pick(StyleValues.WhiteSpace), inherit]),
  overflowWrap: tuple([pick(StyleValues.OverflowWrap), inherit]),

  color: tuple([color, null, inherit]),
  borderColor: tuple([color, inherit, null, inherit]),
  background: tuple([list([optional(character, ` `), color]), list([character, optional(color, StyleValues.Inherit)]), new Map([[null, tuple([` `, StyleValues.Inherit])]]), inherit]),
  backgroundClip: tuple([pick(StyleValues.BackgroundClip), inherit]),
  backgroundColor: tuple([color, inherit]),
  backgroundCharacter: tuple([character, inherit]),

  focusEvents: tuple([true as true, null, inherit]),
  pointerEvents: tuple([true as true, null, inherit]),
};

export type StyleCurrentProperties = {
  [K in PhysicalPropertyName]: Exclude<PropertyType<K>, typeof StyleValues[`Inherit`]>;
};

export const physicalProperties = {
  display: {
    parsers: styleParsers.display,
    triggers: [dirtyLayout, forwardToYoga(`setDisplay`, forwardToYoga.value), onNullSwitch(dirtyRenderList)],
    initial: StyleValues.Display.Flex,
  },

  alignContent: {
    parsers: styleParsers.alignContent,
    triggers: [dirtyLayout, forwardToYoga(`setAlignContent`, forwardToYoga.value)],
    initial: StyleValues.FlexAlign.Stretch,
  },

  alignItems: {
    parsers: styleParsers.alignItems,
    triggers: [dirtyLayout, forwardToYoga(`setAlignItems`, forwardToYoga.value)],
    initial: StyleValues.FlexAlign.Stretch,
  },

  alignSelf: {
    parsers: styleParsers.alignSelf,
    triggers: [dirtyLayout, forwardToYoga(`setAlignSelf`, forwardToYoga.value)],
    initial: StyleValues.FlexAlign.Auto,
  },

  flexDirection: {
    parsers: styleParsers.flexDirection,
    triggers: [dirtyLayout, forwardToYoga(`setFlexDirection`, forwardToYoga.value)],
    initial: StyleValues.FlexDirection.Column,
  },

  position: {
    parsers: styleParsers.position,
    triggers: [dirtyLayout, forwardToYoga(`setPositionType`, forwardToYoga.value)],
    initial: StyleValues.Position.Relative,
  },

  left: {
    parsers: styleParsers.left,
    triggers: [dirtyLayout, forwardToYoga(`setPosition`, Yoga.EDGE_LEFT, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  right: {
    parsers: styleParsers.right,
    triggers: [dirtyLayout, forwardToYoga(`setPosition`, Yoga.EDGE_RIGHT, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  top: {
    parsers: styleParsers.top,
    triggers: [dirtyLayout, forwardToYoga(`setPosition`, Yoga.EDGE_TOP, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  bottom: {
    parsers: styleParsers.bottom,
    triggers: [dirtyLayout, forwardToYoga(`setPosition`, Yoga.EDGE_BOTTOM, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  zIndex: {
    parsers: styleParsers.zIndex,
    triggers: [dirtyRenderList],
    initial: null,
  },

  marginLeft: {
    parsers: styleParsers.marginLeft,
    triggers: [dirtyLayout, forwardToYoga(`setMargin`, Yoga.EDGE_LEFT, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  marginRight: {
    parsers: styleParsers.marginRight,
    triggers: [dirtyLayout, forwardToYoga(`setMargin`, Yoga.EDGE_RIGHT, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  marginTop: {
    parsers: styleParsers.marginTop,
    triggers: [dirtyLayout, forwardToYoga(`setMargin`, Yoga.EDGE_TOP, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  marginBottom: {
    parsers: styleParsers.marginBottom,
    triggers: [dirtyLayout, forwardToYoga(`setMargin`, Yoga.EDGE_BOTTOM, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  flexGrow: {
    parsers: styleParsers.flexGrow,
    triggers: [dirtyLayout, forwardToYoga(`setFlexGrow`, identity)],
    initial: 0,
  },

  flexShrink: {
    parsers: styleParsers.flexShrink,
    triggers: [dirtyLayout, forwardToYoga(`setFlexShrink`, identity)],
    initial: 0,
  },

  flexBasis: {
    parsers: styleParsers.flexBasis,
    triggers: [dirtyLayout, forwardToYoga(`setFlexBasis`, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  width: {
    parsers: styleParsers.width,
    triggers: [dirtyLayout, forwardToYoga(`setWidth`, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  height: {
    parsers: styleParsers.height,
    triggers: [dirtyLayout, forwardToYoga(`setHeight`, forwardToYoga.value)],
    initial: StyleValues.Length.AutoNaN,
  },

  minWidth: {
    parsers: styleParsers.minWidth,
    triggers: [dirtyLayout, forwardToYoga(`setMinWidth`, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  minHeight: {
    parsers: styleParsers.minHeight,
    triggers: [dirtyLayout, forwardToYoga(`setMinHeight`, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  maxWidth: {
    parsers: styleParsers.maxWidth,
    triggers: [dirtyLayout, forwardToYoga(`setMaxWidth`, forwardToYoga.value)],
    initial: StyleValues.Length.Infinity,
  },

  maxHeight: {
    parsers: styleParsers.maxHeight,
    triggers: [dirtyLayout, forwardToYoga(`setMaxHeight`, forwardToYoga.value)],
    initial: StyleValues.Length.Infinity,
  },

  overflow: {
    parsers: styleParsers.overflow,
    triggers: [dirtyClipping],
    initial: StyleValues.Overflow.Visible,
  },

  borderLeftCharacter: {
    parsers: styleParsers.borderLeftCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering, forwardToYoga(`setBorder`, Yoga.EDGE_LEFT, (value: any) => value !== null ? 1 : 0)],
    initial: null,
  },

  borderRightCharacter: {
    parsers: styleParsers.borderRightCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering, forwardToYoga(`setBorder`, Yoga.EDGE_RIGHT, (value: any) => value !== null ? 1 : 0)],
    initial: null,
  },

  borderTopCharacter: {
    parsers: styleParsers.borderTopCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering, forwardToYoga(`setBorder`, Yoga.EDGE_TOP, (value: any) => value !== null ? 1 : 0)],
    initial: null,
  },

  borderBottomCharacter: {
    parsers: styleParsers.borderBottomCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering, forwardToYoga(`setBorder`, Yoga.EDGE_BOTTOM, (value: any) => value !== null ? 1 : 0)],
    initial: null,
  },

  borderTopLeftCharacter: {
    parsers: styleParsers.borderTopLeftCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering],
    initial: null,
  },

  borderTopRightCharacter: {
    parsers: styleParsers.borderTopRightCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering],
    initial: null,
  },

  borderBottomLeftCharacter: {
    parsers: styleParsers.borderBottomLeftCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering],
    initial: null,
  },

  borderBottomRightCharacter: {
    parsers: styleParsers.borderBottomRightCharacter,
    triggers: [onNullSwitch(dirtyLayout), dirtyRendering],
    initial: null,
  },

  paddingLeft: {
    parsers: styleParsers.paddingLeft,
    triggers: [dirtyLayout, forwardToYoga(`setPadding`, Yoga.EDGE_LEFT, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  paddingRight: {
    parsers: styleParsers.paddingRight,
    triggers: [dirtyLayout, forwardToYoga(`setPadding`, Yoga.EDGE_RIGHT, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  paddingTop: {
    parsers: styleParsers.paddingTop,
    triggers: [dirtyLayout, forwardToYoga(`setPadding`, Yoga.EDGE_TOP, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  paddingBottom: {
    parsers: styleParsers.paddingBottom,
    triggers: [dirtyLayout, forwardToYoga(`setPadding`, Yoga.EDGE_BOTTOM, forwardToYoga.value)],
    initial: StyleValues.Length.Zero,
  },

  fontWeight: {
    parsers: styleParsers.fontWeight,
    triggers: [dirtyRendering],
    initial: StyleValues.Inherit,
    default: StyleValues.FontWeight.Normal,
  },

  textAlign: {
    parsers: styleParsers.textAlign,
    triggers: [dirtyRendering, forwardToTextLayout(`justifyText`, (value: any) => value === StyleValues.TextAlign.Justify)],
    initial: StyleValues.TextAlign.Left,
  },

  textDecoration: {
    parsers: styleParsers.textDecoration,
    triggers: [dirtyRendering],
    initial: StyleValues.Inherit,
    default: null,
  },

  whiteSpace: {
    parsers: styleParsers.whiteSpace,
    triggers: [dirtyLayout, forwardToTextLayout(`collapseWhitespaces`, (value: any) => value.doesCollapse), forwardToTextLayout(`demoteNewlines`, (value: any) => value.doesDemoteNewlines), forwardToTextLayout(`preserveLeadingSpaces`, (value: any) => !value.doesCollapse), forwardToTextLayout(`preserveTrailingSpaces`, (value: any) => !value.doesCollapse), forwardToTextLayout(`softWrap`, (value: any) => value.doesWrap)],
    initial: StyleValues.Inherit,
    default: StyleValues.WhiteSpace.Normal,
    initialTrigger: true,
  },

  overflowWrap: {
    parsers: styleParsers.overflowWrap,
    triggers: [dirtyLayout, forwardToTextLayout(`allowWordBreaks`, (value: any) => value.doesBreakWords)],
    initial: StyleValues.OverflowWrap.Normal,
    initialTrigger: true,
  },

  color: {
    parsers: styleParsers.color,
    triggers: [dirtyRendering],
    initial: StyleValues.Inherit,
    default: undefined,
  },

  borderColor: {
    parsers: styleParsers.borderColor,
    triggers: [dirtyRendering],
    initial: null,
  },

  backgroundClip: {
    parsers: styleParsers.backgroundClip,
    triggers: [dirtyRendering],
    initial: StyleValues.BackgroundClip.BorderBox,
  },

  backgroundColor: {
    parsers: styleParsers.backgroundColor,
    triggers: [dirtyRendering],
    initial: StyleValues.Inherit,
    default: undefined,
  },

  backgroundCharacter: {
    parsers: styleParsers.backgroundCharacter,
    triggers: [dirtyRendering],
    initial: StyleValues.Inherit,
    default: ` `,
  },

  focusEvents: {
    parsers: styleParsers.focusEvents,
    triggers: [dirtyFocusList],
    initial: null,
  },

  pointerEvents: {
    parsers: styleParsers.pointerEvents,
    triggers: [],
    initial: true,
  },
} satisfies {
  [K in PropertyName]?: {
    parsers: (typeof styleParsers)[K];
    triggers: Array<any>;
    initialTrigger?: boolean;
  } & ({
    initial: Exclude<PropertyType<K>, typeof StyleValues.Inherit>;
  } | {
    initial: typeof StyleValues.Inherit;
    default: any;
  });
};

export const compoundProperties: {
  [K in CompoundPropertyName]: (
    params: any,
  ) => Partial<PhysicalPropertyTypes>;
} = {
  flex: ([flexGrow = 1, flexShrink = 1, flexBasis = StyleValues.Length.Auto]) => ({flexGrow, flexShrink, flexBasis}),
  inset: ([insetY, insetX = insetY]) => ({left: insetX, right: insetX, top: insetY, bottom: insetY}),
  insetX: insetX => ({left: insetX, right: insetX}),
  insetY: insetY => ({top: insetY, bottom: insetY}),
  margin: ([marginTop, marginRight = marginTop, marginBottom = marginTop, marginLeft = marginRight]) => ({marginTop, marginRight, marginBottom, marginLeft}),
  border: ([borderTopLeftCharacter, borderTopRightCharacter, borderBottomLeftCharacter, borderBottomRightCharacter, borderTopCharacter, borderRightCharacter = borderTopCharacter, borderBottomCharacter = borderTopCharacter, borderLeftCharacter = borderRightCharacter]) => ({borderTopLeftCharacter, borderTopRightCharacter, borderBottomLeftCharacter, borderBottomRightCharacter, borderTopCharacter, borderRightCharacter, borderBottomCharacter, borderLeftCharacter}),
  borderCharacter: ([borderTopLeftCharacter, borderTopRightCharacter, borderBottomLeftCharacter, borderBottomRightCharacter, borderTopCharacter, borderRightCharacter = borderTopCharacter, borderBottomCharacter = borderTopCharacter, borderLeftCharacter = borderRightCharacter]) => ({borderTopLeftCharacter, borderTopRightCharacter, borderBottomLeftCharacter, borderBottomRightCharacter, borderTopCharacter, borderRightCharacter, borderBottomCharacter, borderLeftCharacter}),
  padding: ([paddingTop, paddingRight = paddingTop, paddingBottom = paddingTop, paddingLeft = paddingRight]) => ({paddingTop, paddingRight, paddingBottom, paddingLeft}),
  background: ([backgroundCharacter, backgroundColor]) => ({backgroundCharacter, backgroundColor}),
};

export const propertyNames = new Set(Object.keys(styleParsers));
export const physicalPropertyNames = new Set(Object.keys(physicalProperties));
export const compoundPropertyNames = new Set(Object.keys(compoundProperties));

export function isPropertyName(name: string): name is PropertyName {
  return propertyNames.has(name);
}

export function isPhysicalPropertyName(name: string): name is PhysicalPropertyName {
  return physicalPropertyNames.has(name);
}

export function isCompoundPropertyName(name: string): name is CompoundPropertyName {
  return compoundPropertyNames.has(name);
}

export const defaultComputedStyles: AllComputedStyles = {} as any;
export const defaultInheritedStyles: Array<PhysicalPropertyName> = [];
export const defaultTriggeredStyles: Array<PhysicalPropertyName> = [];

for (const name of Object.keys(physicalProperties)) {
  if (!isPhysicalPropertyName(name))
    continue;

  const propertySpec = physicalProperties[name];
  const initial = propertySpec.initial === StyleValues.Inherit && `default` in propertySpec
    ? propertySpec.default
    : propertySpec.initial;

  if (propertySpec.initial === StyleValues.Inherit)
    defaultInheritedStyles.push(name);

  // @ts-expect-error
  defaultComputedStyles[name] = initial;

  if (`initialTrigger` in propertySpec && propertySpec.initialTrigger) {
    defaultTriggeredStyles.push(name);
  }
}

export function castToPropertyMap(userProperties: Map<PropertyName, any> | Partial<AllPropertiesTypes>) {
  if (`get` in userProperties)
    return userProperties;

  const propertyMap: Map<PropertyName, any> = new Map();

  for (const [k, v] of Object.entries(userProperties))
    if (isPropertyName(k))
      propertyMap.set(k, v);

  return propertyMap;
}

export function expandCompoundProperties(userProperties: Map<PropertyName, any>) {
  const expandedProperties: Array<[PhysicalPropertyName, any]> = [];
  const filteredProperties: Array<[PhysicalPropertyName, any]> = [];

  for (const [k, v] of userProperties) {
    if (isPhysicalPropertyName(k)) {
      filteredProperties.push([k, v]);
    } else {
      expandedProperties.push(...Object.entries(compoundProperties[k](v)) as Array<[PhysicalPropertyName, any]>);
    }
  }

  return expandedProperties.length > 0
    ? new Map([...expandedProperties, ...filteredProperties])
    : userProperties as Map<PhysicalPropertyName, any>;
}
