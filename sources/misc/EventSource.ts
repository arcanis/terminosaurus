import {type TermElement} from '#sources/dom/TermElement';

const noopDefault = () => {};
const emptyListeners = {capture: new Set<Function>(), bubble: new Set<Function>()};

export class Event<Target extends TermElement, Attributes extends Record<string, any>> {
  public bubbles: boolean;
  public cancelable: boolean;

  public immediatlyCanceled = false;
  public propagationStopped = false;

  public defaultPrevented = false;
  public action = noopDefault;

  public target!: Target;
  public currentTarget!: TermElement;

  constructor(public attributes: Attributes, {bubbles = false, cancelable = false} = {}) {
    this.bubbles = bubbles;
    this.cancelable = cancelable;
  }

  reset() {
    this.immediatlyCanceled = false;
    this.propagationStopped = false;

    this.defaultPrevented = false;
    this.action = noopDefault;
  }

  stopImmediatePropagation() {
    this.immediatlyCanceled = true;
    this.propagationStopped = true;
  }

  stopPropagation() {
    this.propagationStopped = true;
  }

  preventDefault() {
    if (!this.cancelable)
      throw new Error(`Failed to execute 'preventDefault': Event is not cancelable.`);

    this.defaultPrevented = true;
  }

  setDefaultAction(callback: () => void) {
    this.action = callback;
  }
}

export type EventNames<Events> = Extract<keyof Events, string>;

export type EventOf<T> = T extends EventSlot<infer TNode, any, infer TAttributes>
  ? Event<TNode, TAttributes>
  : never;

export class EventSlot<TNode extends TermElement, TName extends keyof TNode, TAttributes extends Record<string, any>> {
  private capture = new Set<(e: Event<TNode, TAttributes>) => void>();
  private bubble = new Set<(e: Event<TNode, TAttributes>) => void>();

  constructor(private node: TNode, private name: TName, attrs: TAttributes) {
  }

  addEventListener(callback: (e: Event<TNode, TAttributes>) => void, {capture = false} = {}) {
    const callbacks = capture ? this.capture : this.bubble;

    if (callbacks.has(callback))
      throw new Error(`Failed to execute 'addEventListener': This callback is already listening on this event.`);

    callbacks.add(callback);
  }

  removeEventListener(callback: (e: Event<TNode, TAttributes>) => void, {capture = false} = {}) {
    const callbacks = capture ? this.capture : this.bubble;

    if (!callbacks.has(callback))
      throw new Error(`Failed to execute 'removeEventListener': This callback is not listening on this event.`);

    callbacks.delete(callback);
  }

  dispatchEvent(attributes: TAttributes, {action = noopDefault, bubbles = true, parentNode}: {action?: () => void, bubbles?: boolean, parentNode?: TermElement} = {}) {
    const slots: Array<{
      node: TNode;
      capture: Set<(e: Event<TNode, TAttributes>) => void>;
      bubble: Set<(e: Event<TNode, TAttributes>) => void>;
    }> = [];

    // We traverse the hierarchy to find all nodes we'll need to trigger.
    //
    // For each of them we clone their capture & bubble listeners, because the
    // handlers may cause the event list to change (for example that's frequent
    // in React, where the event listener would cause a re-render which would
    // lead to the listener functions technically being new instances).
    //
    for (let node: TermElement | null = this.node; node; node = node === this.node ? (parentNode ?? node.parentNode) : node.parentNode) {
      if (!Object.hasOwn(node, this.name))
        continue;

      const {
        capture,
        bubble,
      } = (node as any)[this.name];

      slots.unshift({
        node,
        capture: [...capture],
        bubble: [...bubble],
      } as any);
    }

    const event = new Event<TNode, TAttributes>(attributes);
    event.bubbles = bubbles;
    event.target = this.node;
    event.action = action;

    for (let t = 0, T = slots.length; t < T; ++t) {
      if (event.propagationStopped)
        break;

      const slot = slots[t];
      for (const callback of slot.capture) {
        if (event.immediatlyCanceled)
          break;

        event.currentTarget = slot.node;
        callback.call(event.currentTarget, event);
      }
    }

    for (let t = 0, T = Math.max(0, event.bubbles ? slots.length : 1); t < T; ++t) {
      if (event.propagationStopped)
        break;

      const slot = slots[slots.length - t - 1];
      for (const callback of slot.bubble) {
        if (event.immediatlyCanceled)
          break;

        event.currentTarget = slot.node;
        callback.call(event.currentTarget, event);
      }
    }

    if (!event.defaultPrevented) {
      event.action();
    }
  }
}
