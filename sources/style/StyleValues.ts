import Yoga from 'yogini';

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
    None: Yoga.DISPLAY_NONE,
    Flex: Yoga.DISPLAY_FLEX,
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

  FontWeight: enumToStyle([
    `Light`,
    `Normal`,
    `Bold`,
  ]),

  FlexAlign: yogaEnumToStyle({
    Auto: Yoga.ALIGN_AUTO,

    FlexStart: Yoga.ALIGN_FLEX_START,
    FlexEnd: Yoga.ALIGN_FLEX_END,

    Center: Yoga.ALIGN_CENTER,

    SpaceBetween: Yoga.ALIGN_SPACE_BETWEEN,
    SpaceAround: Yoga.ALIGN_SPACE_AROUND,

    Stretch: Yoga.ALIGN_STRETCH,
  }),

  FlexDirection: yogaEnumToStyle({
    Row: Yoga.FLEX_DIRECTION_ROW,
    RowReverse: Yoga.FLEX_DIRECTION_ROW_REVERSE,

    Column: Yoga.FLEX_DIRECTION_COLUMN,
    ColumnReverse: Yoga.FLEX_DIRECTION_COLUMN_REVERSE,
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
    },
    Visible: {
      doesHideOverflow: false,
    },
  },

  Position: {
    Relative: {
      isAbsolutelyPositioned: false,
      isPositioned: true,
      isScrollAware: true,
      yoga: Yoga.POSITION_TYPE_RELATIVE,
    },
    Sticky: {
      isAbsolutelyPositioned: false,
      isPositioned: true,
      isScrollAware: true,
      yoga: Yoga.POSITION_TYPE_RELATIVE,
    },
    Absolute: {
      isAbsolutelyPositioned: true,
      isPositioned: true,
      isScrollAware: true,
      yoga: Yoga.POSITION_TYPE_ABSOLUTE,
    },
    Fixed: {
      isAbsolutelyPositioned: true,
      isPositioned: true,
      isScrollAware: false,
      yoga: Yoga.POSITION_TYPE_ABSOLUTE,
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
