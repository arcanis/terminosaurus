// @ts-expect-error
import {style} from '@manaflair/term-strings';

export class StyleColor {
  public front: string;
  public back: string;

  constructor(public name: string) {
    this.front = style.color.front(this.name).in;
    this.back = style.color.back(this.name).in;
  }

  serialize() {
    return this.name;
  }
}
