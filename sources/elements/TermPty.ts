import {IBufferCell, Terminal} from '@xterm/xterm';

import * as pty                from '#sources/deps/node-pty';
import {TermElement}           from '#sources/dom/TermElement';
import {makeRuleset}           from '#sources/style/tools/makeRuleset';

const emptyArray: number[] = [];
const zeroArray: number[] = [0];

const ruleset = makeRuleset({
  [`*`]: {
    focusEvents: true,
  },
});

function equalFg(cell1: IBufferCell, cell2: IBufferCell): boolean {
  return cell1.getFgColorMode() === cell2.getFgColorMode() && cell1.getFgColor() === cell2.getFgColor();
}

function equalBg(cell1: IBufferCell, cell2: IBufferCell): boolean {
  return cell1.getBgColorMode() === cell2.getBgColorMode() && cell1.getBgColor() === cell2.getBgColor();
}

function equalFlags(cell1: IBufferCell, cell2: IBufferCell): boolean {
  return cell1.isInverse() === cell2.isInverse()
    && cell1.isBold() === cell2.isBold()
    && cell1.isUnderline() === cell2.isUnderline()
    && cell1.isOverline() === cell2.isOverline()
    && cell1.isBlink() === cell2.isBlink()
    && cell1.isInvisible() === cell2.isInvisible()
    && cell1.isItalic() === cell2.isItalic()
    && cell1.isDim() === cell2.isDim()
    && cell1.isStrikethrough() === cell2.isStrikethrough();
}

function fixMouse(sequence: string, dx: number, dy: number): string {
  return sequence.replace(/(\d+);(\d+)([Mm])$/, ($0, $1, $2, $3) => {
    const x = parseInt($1, 10) - dx;
    const y = parseInt($2, 10) - dy;
    return `${x};${y}${$3}`;
  });
}

export class TermPty extends TermElement {
  term: Terminal;
  termScroll: number = 0;
  pty?: pty.IPty;

  constructor() {
    super();

    this.styleManager.addRuleset(ruleset);

    this.term = new Terminal({
      convertEol: true,
      ignoreBracketedPasteMode: true,
    });

    this.term.onScroll(termScroll => {
      this.termScroll = termScroll;
    });

    this.term.onData(data => {
      this.pty?.write(data);
    });

    this.term.onCursorMove(() => {
      this.caret = {
        x: this.term.buffer.active.cursorX,
        y: this.term.buffer.active.cursorY,
      };
    });

    this.onLayout.addEventListener(() => {
      const bufWidth = Math.max(1, this.contentRect.w);
      const bufHeight = Math.max(1, this.contentRect.h);

      this.term.resize(bufWidth, bufHeight);
      this.pty?.resize(this.term.cols, this.term.rows);
    });

    this.onMouseDown.addEventListener(e => {
      if (!this.caret)
        return;

      e.action = () => {
        this.focus();

        if (this.term.modes.mouseTrackingMode !== `none`) {
          this.term.input(fixMouse(e.attributes.mouse.sequence, this.contentWorldRect.x, this.contentWorldRect.y));
        }
      };
    });

    this.onMouseUp.addEventListener(e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (this.term.modes.mouseTrackingMode !== `none`) {
          this.term.input(fixMouse(e.attributes.mouse.sequence, this.contentWorldRect.x, this.contentWorldRect.y));
        }
      };
    });

    this.onKeyPress.addEventListener(e => {
      if (!this.caret)
        return;

      e.action = () => {
        this.term.input(e.attributes.key.sequence);
      };
    });
  }

  cleanup() {
    super.cleanup();

    this.pty?.kill();
    this.term.dispose();
  }

  renderContent(x: number, y: number, l: number) {
    const line = this.term.buffer.active.getLine(y + this.termScroll);
    if (!line)
      return this.renderBackground(l);

    let out = ``;
    let size = 0;

    let lastCell = this.term.buffer.active.getNullCell();

    for (let t = x; t < x + l; ++t) {
      const cell = line.getCell(t);
      if (!cell)
        break;

      const isEmptyCell = cell.getChars() === '';

      const sgrSeq = this._diffStyle(cell, lastCell);
      const styleChanged = isEmptyCell ? !equalBg(lastCell, cell) : sgrSeq.length > 0;

      if (styleChanged)
        out += `\x1b[${sgrSeq.join(';')}m`;

      out += cell.getChars() || ` `;
      size += 1;

      lastCell = cell;
    }

    return out + `\x1b[0m` + this.renderBackground(l - size);
  }

  private _diffStyle(cell: IBufferCell, oldCell: IBufferCell): number[] {
    const fgChanged = !equalFg(cell, oldCell);
    const bgChanged = !equalBg(cell, oldCell);
    const flagsChanged = !equalFlags(cell, oldCell);

    if (!fgChanged && !bgChanged && !flagsChanged)
      return emptyArray;

    if (cell.isAttributeDefault() && !oldCell.isAttributeDefault()) 
      return zeroArray;

    const sgrSeq: number[] = [];

    if (fgChanged) {
      const color = cell.getFgColor();
      if (cell.isFgRGB()) {
        sgrSeq.push(38, 2, (color >>> 16) & 0xFF, (color >>> 8) & 0xFF, color & 0xFF);
      } else if (cell.isFgPalette()) {
        if (color >= 16) {
          sgrSeq.push(38, 5, color);
        } else {
          sgrSeq.push(color & 8 ? 90 + (color & 7) : 30 + (color & 7));
        }
      } else {
        sgrSeq.push(39);
      }
    }

    if (bgChanged) {
      const color = cell.getBgColor();
      if (cell.isBgRGB()) {
        sgrSeq.push(48, 2, (color >>> 16) & 0xFF, (color >>> 8) & 0xFF, color & 0xFF);
      } else if (cell.isBgPalette()) {
        if (color >= 16) {
          sgrSeq.push(48, 5, color);
        } else {
          sgrSeq.push(color & 8 ? 100 + (color & 7) : 40 + (color & 7));
        }
      } else {
        sgrSeq.push(49);
      }
    }

    if (flagsChanged) {
      if (cell.isInverse() !== oldCell.isInverse())
        sgrSeq.push(cell.isInverse() ? 7 : 27);

      if (cell.isBold() !== oldCell.isBold())
        sgrSeq.push(cell.isBold() ? 1 : 22);

      if (cell.isUnderline() !== oldCell.isUnderline())
        sgrSeq.push(cell.isUnderline() ? 4 : 24);

      if (cell.isOverline() !== oldCell.isOverline())
        sgrSeq.push(cell.isOverline() ? 53 : 55);

      if (cell.isBlink() !== oldCell.isBlink())
        sgrSeq.push(cell.isBlink() ? 5 : 25);

      if (cell.isInvisible() !== oldCell.isInvisible())
        sgrSeq.push(cell.isInvisible() ? 8 : 28);

      if (cell.isItalic() !== oldCell.isItalic())
        sgrSeq.push(cell.isItalic() ? 3 : 23);

      if (cell.isDim() !== oldCell.isDim())
        sgrSeq.push(cell.isDim() ? 2 : 22);

      if (cell.isStrikethrough() !== oldCell.isStrikethrough()) {
        sgrSeq.push(cell.isStrikethrough() ? 9 : 29);
      }
    }

    return sgrSeq;
  }

  spawn(fileName: string, args: string[] = []) {
    this.pty?.kill();

    this.pty = pty.spawn(fileName, args, {
      name: 'xterm-color',
      cols: this.term.cols,
      rows: this.term.rows,
      cwd: process.cwd(),
      env: process.env,
    });

    this.pty.onData(data => {
      this.term.write(data, () => {
        this.queueDirtyRect();
      });
    });
  }
}
