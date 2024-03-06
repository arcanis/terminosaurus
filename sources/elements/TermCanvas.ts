import {TermElement} from '#sources/dom/TermElement';

export type TermCanvasRenderFn = (
  element: TermCanvas,
  x: number,
  y: number,
  l: number,
) => string | null;

export class TermCanvas extends TermElement {
  render: TermCanvasRenderFn | null = null;

  resetRender() {
    this.setRender(null);
  }

  setRender(fn: TermCanvasRenderFn | null) {
    this.render = fn;

    this.queueDirtyRect();
  }

  renderContent(x: number, y: number, l: number) {
    return this.render?.(this, x, y, l) ?? this.renderBackground(l);
  }
}
