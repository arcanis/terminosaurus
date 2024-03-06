import {TermText}      from '#sources/elements/TermText';
import {StyleValues}   from '#sources/index';
import {Point}         from '#sources/misc/Point';
import {color, length} from '#sources/style/styleParsers';
import {makeRuleset}   from '#sources/style/tools/makeRuleset';

const ruleset = makeRuleset({
  [`*`]: {
    whiteSpace: StyleValues.WhiteSpace.Pre,
    focusEvents: true,
  },
  [`:decorated`]: {
    minHeight: StyleValues.Length.One,
    backgroundCharacter: `.`,
  },
  [`:decorated:multiline`]: {
    minHeight: length(10),
  },
  [`:decorated:focus`]: {
    backgroundColor: color(`darkblue`),
  },
});

export class TermInput extends TermText {
  constructor() {
    super();

    this.styleManager.addRuleset(ruleset);
  }

  get multiline() {
    return this.enterIsNewline;
  }

  resetMultiline() {
    this.setMultiline(false);
  }

  setMultiline(multiline: boolean) {
    this.enterIsNewline = multiline;

    this.styleManager.setStateStatus(`multiline`, multiline);
  }

  autoWidth = false;

  resetAutoWidth() {
    this.setAutoWidth(false);
  }

  setAutoWidth(autoWidth: boolean) {
    this.autoWidth = autoWidth;

    this.setDirtyLayoutFlag();
  }

  autoHeight = false;

  resetAutoHeight() {
    this.setAutoHeight(false);
  }

  setAutoHeight(autoHeight: boolean) {
    this.autoHeight = autoHeight;

    this.setDirtyLayoutFlag();
  }

  getPreferredSize(min: Point, max: Point) {
    let {x, y} = super.getPreferredSize(min, max);

    if (!this.autoWidth)
      x = 0;
    if (!this.autoHeight)
      y = 1;

    return {x, y};
  }
}
