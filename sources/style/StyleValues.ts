import {Display, Align, FlexDirection, PositionType} from 'yoga-layout/load';

export const Inherit: unique symbol = Symbol();

type TupleToObject<Type extends Array<any>> = {
  [Key in Type[number]]: Key
};

function enumToStyle<T extends Array<string>>(record: [...T]) {
  const values: {
    [K in keyof TupleToObject<T>]: {};
  } = {} as any;

  for (const name of record)
    (values as any)[name] = {};

  return values;
}

function yogaEnumToStyle<T extends Record<string, any>>(record: T) {
  const values: {
    [K in keyof T]: {yoga: T[K]};
  } = {} as any;

  for (const [name, value] of Object.entries(record))
    (values as any)[name] = {yoga: value};

  return values;
}

export const StyleValues = {
  Inherit,

  Length: {
    Zero: {
      value: 0,
      isRelative: false,
      yoga: 0,
    },
    One: {
      value: 1,
      isRelative: false,
      yoga: 0,
    },
    Auto: {
      value: 0,
      isRelative: false,
      yoga: 0,
    },
    AutoNaN: {
      value: 0,
      isRelative: false,
      yoga: `auto`,
    },
    Infinity: {
      value: Number.MAX_SAFE_INTEGER,
      isRelative: false,
      yoga: Number.MAX_SAFE_INTEGER,
    },
  },

  Border: {
    Simple: [`+`, `+`, `+`, `+`, `-`, `|`],
    Modern: [`┌`, `┐`, `└`, `┘`, `─`, `│`],
    Strong: [`┏`, `┓`, `┗`, `┛`, `━`, `┃`],
    Double: [`╔`, `╗`, `╚`, `╝`, `═`, `║`],
    Block: [`▄`, `▄`, `▀`, `▀`, `▄`, `█`, `▀`, `█`],
    Rounded: [`╭`, `╮`, `╰`, `╯`, `─`, `│`],
  },

  Display: yogaEnumToStyle({
    None: Display.None,
    Flex: Display.Flex,
  }),

  TextAlign: enumToStyle([
    `Left`,
    `Center`,
    `Right`,
    `Justify`,
  ]),

  TextDecoration: enumToStyle([
    `Underline`,
  ]),

  Flex: enumToStyle([
    `Flex`,
  ]),

  OverflowWrap: enumToStyle([
    `Normal`,
    `BreakWord`,
  ]),

  FontStyle: enumToStyle([
    `Normal`,
    `Italic`,
  ]),

  FontWeight: enumToStyle([
    `Light`,
    `Normal`,
    `Bold`,
  ]),

  FlexAlign: yogaEnumToStyle({
    Auto: Align.Auto,

    FlexStart: Align.FlexStart,
    FlexEnd: Align.FlexEnd,

    Center: Align.Center,

    SpaceBetween: Align.SpaceBetween,
    SpaceAround: Align.SpaceAround,

    Stretch: Align.Stretch,
  }),

  FlexDirection: yogaEnumToStyle({
    Row: FlexDirection.Row,
    RowReverse: FlexDirection.RowReverse,

    Column: FlexDirection.Column,
    ColumnReverse: FlexDirection.ColumnReverse,
  }),

  BackgroundClip: {
    BorderBox: {
      doesIncludeBorders: true,
      doesIncludePadding: true,
    },
    PaddingBox: {
      doesIncludeBorders: false,
      doesIncludePadding: true,
    },
    ContentBox: {
      doesIncludeBorders: false,
      doesIncludePadding: false,
    },
  },

  Overflow: {
    Hidden: {
      doesHideOverflow: true,
      doesAllowScroll: false,
    },
    Visible: {
      doesHideOverflow: false,
      doesAllowScroll: false,
    },
    Scroll: {
      doesHideOverflow: true,
      doesAllowScroll: true,
    },
  },

  Position: {
    Relative: {
      isAbsolutelyPositioned: false,
      isPositioned: true,
      isScrollAware: true,
      yoga: PositionType.Relative,
    },
    Sticky: {
      isAbsolutelyPositioned: false,
      isPositioned: true,
      isScrollAware: true,
      yoga: PositionType.Relative,
    },
    Absolute: {
      isAbsolutelyPositioned: true,
      isPositioned: true,
      isScrollAware: true,
      yoga: PositionType.Absolute,
    },
    Fixed: {
      isAbsolutelyPositioned: true,
      isPositioned: true,
      isScrollAware: false,
      yoga: PositionType.Absolute,
    },
  },

  WhiteSpace: {
    Normal: {
      doesCollapse: true,
      doesDemoteNewlines: true,
      doesWrap: true,
    },
    NoWrap: {
      doesCollapse: true,
      doesDemoteNewlines: true,
      doesWrap: false,
    },
    Pre: {
      doesCollapse: false,
      doesDemoteNewlines: false,
      doesWrap: false,
    },
    PreWrap: {
      doesCollapse: false,
      doesDemoteNewlines: false,
      doesWrap: true,
    },
    PreLine: {
      doesCollapse: true,
      doesDemoteNewlines: false,
      doesWrap: true,
    },
  },
};
