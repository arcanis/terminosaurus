import {TermText}      from '../elements/TermText';
import {StyleValues}   from '../index';
import {Point}         from '../misc/Point';
import {color, length} from '../style/styleParsers';
import {makeRuleset}   from '../style/tools/makeRuleset';

const ruleset = makeRuleset({
  [`*`]: {
    whiteSpace: StyleValues.WhiteSpace.Pre,
    overflow: StyleValues.Overflow.Scroll,
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

  resetSecret() {
    this.setSecret(false);
  }

  setSecret(secret: boolean) {
    this.secret = secret;
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
