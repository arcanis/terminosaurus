export class TextBuffer {
  private text = ``;

  getLength() {
    return this.text.length;
  }

  getValue() {
    return this.text;
  }

  setValue(newText: string) {
    if (this.text === newText)
      return;

    const oldText = this.text;
    this.text = newText;
    this.onChange(0, oldText, newText);
  }

  insert(offset: number, text: string) {
    if (text.length === 0)
      return;

    this.text = this.text.slice(0, offset) + text + this.text.slice(offset);
    this.onChange(offset, ``, text);
  }

  delete(offset: number, length: number) {
    if (length === 0)
      return;

    const oldText = this.text.slice(offset, offset + length);
    this.text = this.text.slice(0, offset) + this.text.slice(offset + length);
    this.onChange(offset, oldText, ``);
  }

  onChange(offset: number, oldText: string, newText: string) {
  }
}
