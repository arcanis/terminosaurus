import {TermElement} from '#sources/dom/TermElement';
import {TermText}    from '#sources/index';

export abstract class ReactNode {
  prev: ReactNode | null = null;
  next: ReactNode | null = null;

  termNode: TermElement | null = null;
}

export class ReactElement extends ReactNode {
  termNode: TermElement;

  firstChild: ReactNode | null = null;
  lastChild: ReactNode | null = null;

  constructor(termNode: TermElement) {
    super();

    this.termNode = termNode;
  }

  appendChild(node: ReactNode): void {
    if (this.lastChild)
      this.lastChild.next = node;

    node.prev = this.lastChild;
    this.lastChild = node;

    if (node instanceof ReactText) {
      if (node.prev && node.prev instanceof ReactText) {
        node.firstText = node.prev.firstText;
        node.firstText!.updateText();
      } else {
        node.startText(this.termNode);
        this.attach(node, null);
      }
    } else {
      this.attach(node, null);
    }
  }

  insertBefore(node: ReactNode, before: ReactNode) {
    if (before.prev)
      before.prev.next = node;

    node.prev = before.prev;
    node.next = before;

    before.prev = node;

    if (this.firstChild === before)
      this.firstChild = node;

    if (node instanceof ReactText) {
      if (node.prev && node.prev instanceof ReactText) {
        node.firstText = node.prev.firstText;
        node.firstText!.updateText();
      } else {
        const beforeNoText = node.startText(this.termNode);
        if (!(node.next && node.next instanceof ReactText)) {
          this.attach(node, beforeNoText);
        }
      }
    } else {
      if (node.prev && node.prev instanceof ReactText) {
        node.prev.firstText!.updateText();
        if (before instanceof ReactText) {
          const beforeNoText = before.startText(this.termNode);
          this.attach(before, beforeNoText);
        }
      }

      this.attach(node as ReactElement, before);
    }
  }

  removeChild(node: ReactNode) {
    const prev = node.prev;
    const next = node.next;

    node.prev = null;
    node.next = null;

    if (prev)
      prev.next = next;
    if (next)
      next.prev = prev;

    if (node instanceof ReactText) {
      const termNode = node.termNode;

      const firstText = node.firstText!;
      node.firstText = null;

      if (firstText === node) {
        if (next && next instanceof ReactText) {
          next.termNode = termNode;
          next.updateText();
        } else {
          this.detach(node);
        }
      } else {
        firstText!.updateText();
      }
    } else {
      this.detach(node);

      if (prev && next && prev instanceof ReactText && next instanceof ReactText) {
        this.detach(next);
        next.termNode = null;

        prev.firstText!.startText(this.termNode);
      }
    }
  }

  private attach(node: ReactNode, before: ReactNode | null) {
    // We don't attach react text nodes to terminal text nodes
    if (node instanceof ReactText && this.termNode instanceof TermText)
      return;

    this.termNode.insertBefore(node.termNode!, before?.termNode ?? null);
  }

  private detach(node: ReactNode) {
    this.termNode.removeChild(node.termNode!);
  }
}

export class ReactText extends ReactNode {
  parentNode?: ReactElement;
  termNode: TermText | null = null;

  firstText: ReactText | null = null;

  constructor(private text: string) {
    super();
  }

  startText(termNode: TermElement) {
    this.termNode = termNode instanceof TermText
      ? termNode
      : this.next && this.next instanceof ReactText && this.next.firstText === this.next
        ? this.next.termNode
        : new TermText();

    return this.updateText();
  }

  updateText() {
    const segments: Array<string> = [];

    let current: ReactNode | null = this;
    while (current && current instanceof ReactText) {
      segments.push(current.text);
      current.firstText = this;
      current = current.next;
    }

    this.setSegments(segments);

    return current;
  }

  setSegments(segments: Array<string>) {
    this.termNode!.setText(segments.join(``));
  }

  setText(text: string) {
    this.text = text;

    this.firstText!.updateText();
  }
}
