import {TextLayout}              from 'mono-layout';

import {createLayout}            from '#sources/deps/mono';
import {TermElement}             from '#sources/dom/TermElement';
import {findAncestorByPredicate} from '#sources/dom/traverse';
import {TermForm}                from '#sources/elements/TermForm';
import {EventSlot}               from '#sources/misc/EventSource';
import {Point}                   from '#sources/misc/Point';
import {TextBuffer}              from '#sources/misc/TextBuffer';
import {StyleValues}             from '#sources/style/StyleValues';

const decoder = new TextDecoder();

export class TermText extends TermElement {
  declare public textLayout: TextLayout;

  public textBuffer = new TextBuffer();

  public enterIsNewline = false;
  public readOnly = false;

  public caretIndex: number | null = 0;
  public caretMaxColumn: number | null = 0;

  public onChange = new EventSlot(this as TermText, `onChange`, {});

  constructor() {
    super({textLayout: createLayout()});

    this.caretIndex = 0;
    this.caret = {x: 0, y: 0};
    this.caretMaxColumn = 0;

    this.textBuffer.onChange = this.notifyChange;
    this.textLayout.setSource(``);

    this.onLayout.addEventListener(() => {
      if (this.textLayout.setConfiguration({columns: this.contentRect.w})) {
        this.textLayout.setSource(this.textBuffer.getValue());
      }
    });

    this.addShortcutListener(`left`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (!this.caret)
          return;

        this.caretIndex = Math.max(0, this.caretIndex! - 1);
        this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex);
        this.caretMaxColumn = this.caret.x;

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});

    this.addShortcutListener(`right`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (!this.caret)
          return;

        this.caretIndex = Math.min(this.caretIndex! + 1, this.textBuffer.getLength());
        this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex);
        this.caretMaxColumn = this.caret.x;

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent(new Event(`caret`));
      };
    }, {capture: true});

    this.addShortcutListener(`up`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (!this.caret)
          return;

        this.caret.x = this.caretMaxColumn!;
        this.caret = this.textLayout.getPositionAbove(this.caret)[0];
        this.caretIndex = this.textLayout.getCharacterIndexForPosition(this.caret);

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent(new Event(`caret`));
      };
    }, {capture: true});

    this.addShortcutListener(`down`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (!this.caret)
          return;

        this.caret.x = this.caretMaxColumn!;
        this.caret = this.textLayout.getPositionBelow(this.caret)[0];
        this.caretIndex = this.textLayout.getCharacterIndexForPosition(this.caret);

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});

    this.addShortcutListener(`pgup`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (!this.caret)
          return;

        this.caret.x = this.caretMaxColumn!;
        this.caret = this.textLayout.getPositionAbove(this.caret, this.elementRect.h)[0];
        this.caretIndex = this.textLayout.getCharacterIndexForPosition(this.caret);

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});

    this.addShortcutListener(`pgdown`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        if (!this.caret)
          return;

        this.caret.x = this.caretMaxColumn!;
        this.caret = this.textLayout.getPositionBelow(this.caret, this.elementRect.h)[0];
        this.caretIndex = this.textLayout.getCharacterIndexForPosition(this.caret);

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});

    this.addShortcutListener(`home, ctrl-a`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        this.caret = {x: 0, y: 0};
        this.caretIndex = 0;
        this.caretMaxColumn = 0;

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});

    this.addShortcutListener(`end, ctrl-e`, e => {
      if (!this.caret)
        return;

      e.action = () => {
        this.caretIndex = this.textBuffer.getLength();
        this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex!);
        this.caretMaxColumn = this.caret.x;

        this.scrollCellIntoView(this.caret);

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});

    this.addShortcutListener(`enter`, e => {
      if (this.enterIsNewline && !this.caret)
        return;

      if (this.enterIsNewline && this.readOnly)
        return;

      e.action = () => {
        if (this.enterIsNewline) {
          const caretIndex = this.caretIndex!;

          this.textBuffer.insert(caretIndex, `\n`);

          this.caretIndex = caretIndex + 1;
          this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex);
          this.caretMaxColumn = this.caret.x;

          this.scrollCellIntoView(this.caret);
        } else {
          const form = findAncestorByPredicate(this, (node): node is TermForm => node instanceof TermForm);

          if (form) {
            form.onSubmit.dispatchEvent({});
          }
        }
      };
    }, {capture: true});

    this.addShortcutListener(`backspace`, e => {
      if (!this.caret)
        return;

      if (this.readOnly)
        return;

      e.action = () => {
        if (this.caretIndex === 0)
          return;

        const caretIndex = this.caretIndex!;

        this.textBuffer.delete(caretIndex - 1, 1);

        this.caretIndex = caretIndex - 1;
        this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex);
        this.caretMaxColumn = this.caret.x;

        this.scrollCellIntoView(this.caret);
      };
    }, {capture: true});

    this.addShortcutListener(`delete`, e => {
      if (!this.caret)
        return;

      if (this.readOnly)
        return;

      e.action = () => {
        const caretIndex = this.caretIndex!;

        this.textBuffer.delete(caretIndex, 1);

        this.onChange.dispatchEvent({});
        this.scrollCellIntoView(this.caret!);
      };
    }, {capture: true});

    this.onData.addEventListener(e => {
      if (!this.caret)
        return;

      if (this.readOnly)
        return;

      e.action = () => {
        const string = decoder.decode(e.attributes.data);

        const caretIndex = this.caretIndex!;

        this.textBuffer.insert(caretIndex, string);

        this.caretIndex = caretIndex + string.length;
        this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex);
        this.caretMaxColumn = this.caret.x;

        this.scrollCellIntoView(this.caret);
      };
    }, {capture: true});

    this.onMouseDown.addEventListener(e => {
      if (e.attributes.mouse.name !== `left`)
        return;

      if (!this.caret)
        return;

      if (!this.styleManager.computed.focusEvents)
        return;

      e.action = () => {
        this.caret = this.textLayout.getFixedCellPosition(e.attributes.contentCoordinates);
        this.caretIndex = this.textLayout.getCharacterIndexForPosition(this.caret);
        this.caretMaxColumn = this.caret.x;

        this.focus();

        this.onCaret.dispatchEvent({});
      };
    }, {capture: true});
  }

  get disabled() {
    return this.caret === null;
  }

  resetDisabled() {
    this.setDisabled(false);
  }

  setDisabled(value: boolean) {
    if (value) {
      this.caretIndex = null;
      this.caret = null;
      this.caretMaxColumn = null;
    } else {
      this.caretIndex = 0;
      this.caret = {x: 0, y: 0};
      this.caretMaxColumn = 0;
    }
  }

  get text() {
    return this.textBuffer.getValue();
  }

  resetText() {
    this.setText(``);
  }

  setText(content: string) {
    const updateCaret = this.caretIndex !== null && content.length < this.caretIndex;
    this.textBuffer.setValue(content);

    if (updateCaret) {
      this.caretIndex = content.length;
      this.caret = this.textLayout.getPositionForCharacterIndex(this.caretIndex);
      this.caretMaxColumn = this.caret.x;
    }
  }

  getPreferredSize(min: Point, max: Point) {
    if (this.textLayout.setConfiguration({columns: max.x}))
      this.textLayout.setSource(this.textBuffer.getValue());

    const x = Math.min(this.textLayout.getColumnCount(), max.x);
    const y = this.textLayout.getRowCount();

    return {x, y};
  }

  getInternalContentWidth() {
    return this.textLayout.getColumnCount();
  }

  getInternalContentHeight() {
    return this.textLayout.getRowCount();
  }

  renderContent(x: number, y: number, l: number) {
    if (this.textLayout.getRowCount() <= y)
      return this.renderBackground(l);

    const fullLineLength = this.textLayout.getLineLength(y);

    let fullLineStart = 0;
    if (this.styleManager.computed.textAlign === StyleValues.TextAlign.Center)
      fullLineStart = Math.floor((this.scrollRect.w - fullLineLength) / 2);
    if (this.styleManager.computed.textAlign === StyleValues.TextAlign.Right)
      fullLineStart = this.scrollRect.w - fullLineLength;

    const prefixLength = Math.max(0, Math.min(fullLineStart - x, l));
    const lineStart = Math.max(0, x - fullLineStart);
    const lineLength = Math.max(0, Math.min(l + x - fullLineStart, l, fullLineLength - lineStart));
    const suffixLength = Math.max(0, l - prefixLength - lineLength);

    const prefix = this.renderBackground(prefixLength);
    const text = this.renderText(this.textLayout.getLineSlice(y, lineStart, lineStart + lineLength));

    const suffix = this.renderBackground(suffixLength);

    return prefix + text + suffix;
  }

  notifyChange = (offset: number, oldText: string, newText: string) => {
    const start = this.textLayout.getPositionForCharacterIndex(offset);

    const oldColumnCount = this.textLayout.getColumnCount();
    const oldRowCount = this.textLayout.getRowCount();

    const oldEnd = this.textLayout.getPositionForCharacterIndex(offset + oldText.length);
    this.textLayout.spliceSource(offset, oldText.length, newText);
    const newEnd = this.textLayout.getPositionForCharacterIndex(offset + newText.length);

    const newColumnCount = this.textLayout.getColumnCount();
    const newRowCount = this.textLayout.getRowCount();

    if (newColumnCount !== oldColumnCount || newRowCount !== oldRowCount) {
      this.yoga.markDirty();

      this.setDirtyLayoutFlag();
      this.queueDirtyRect();
    } else if (oldEnd.y === newEnd.y) {
      const dirtyRect = {...this.contentWorldRect};

      //dirtyRect.x += start.x - this.scrollRect.x; // We can't apply this optimization because of syntax highlightning and non-left-aligned alignments, where adding a character might change the way the *previous ones* are displayed
      dirtyRect.y += start.y - this.scrollRect.y;

      dirtyRect.h = 1;

      this.queueDirtyRect(dirtyRect);
    } else {
      const dirtyRect = {...this.contentWorldRect};

      dirtyRect.y += start.y - this.scrollRect.y;

      dirtyRect.h = Math.max(oldEnd.y, newEnd.y) - start.y + 1;

      this.queueDirtyRect(dirtyRect);
    }

    this.onChange.dispatchEvent({});
    this.onCaret.dispatchEvent({});
  };
}
