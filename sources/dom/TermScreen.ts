import {Info, Key, Mouse, parseTerminalInputs, Production} from 'term-strings/parse';
import {cursor, feature, request, screen, style}           from 'term-strings';
import Observable                                          from 'zen-observable';

import {TermElement}                                       from '#sources/dom/TermElement';
import {EventOf}                                           from '#sources/misc/EventSource';
import {Point}                                             from '#sources/misc/Point';
import {getIntersectingRect, Rect, substractRect}          from '#sources/misc/Rect';
import {Ruleset}                                           from '#sources/style/Ruleset';
import {StyleValues}                                       from '#sources/style/StyleValues';
import {length}                                            from '#sources/style/styleParsers';

const decoder = new TextDecoder();

// We will iterate through those colors when rendering if the debugPaintRects option is set
const DEBUG_COLORS = [`red`, `green`, `blue`, `magenta`, `yellow`];
let currentDebugColorIndex = 0;

const rafFn = typeof requestAnimationFrame !== `undefined`
  ? requestAnimationFrame
  : setImmediate;

const clearFn = typeof cancelAnimationFrame !== `undefined`
  ? cancelAnimationFrame
  : clearImmediate;

export type ScreenIn = {
  setRawMode?: (status: boolean) => void;
  addListener(event: `data`, cb: (data: Uint8Array) => void): void;
  addListener(event: `error`, cb: (error: Error) => void): void;
  addListener(event: string, cb: Function): void;
  pause(): void;
};

export type ScreenOut = {
  columns?: number;
  rows?: number;
  addListener(event: string, cb: Function): void;
  removeListener(event: string, cb: Function): void;
  write(data: string): void;
};

export type ScreenStreams = {
  stdin: ScreenIn;
  stdout: ScreenOut;
};

export type RunOptions = Partial<ScreenStreams> & {
  trackOutputSize?: boolean;
  throttleMouseMoveEvents?: number;
};

export class TermScreen {
  public rootNode = new TermElement();
  public rootStyle = new Ruleset();

  // We keep track of whether the screen is fully setup or not (has stdin/stdout)
  public resolve?: (exitCode: number) => void;

  // Input/output streams
  public stdin: ScreenIn | null = null;
  public stdout: ScreenOut | null = null;

  // Our subscription to the input events
  public subscription: ZenObservable.Subscription | null = null;

  // A timer used to trigger layout / clipping / render updates after a node becomes dirty
  public updateTimer: ReturnType<typeof rafFn> | null = null;

  //
  public trackOutputSize = false;

  //
  public mouseOverElement: TermElement | null = null;
  public mouseEnterElements: Array<TermElement> = [];

  public originalClearColor: string | null = null;
  public clearColor: string | null = null;

  constructor() {
    this.rootStyle.set({
      position: StyleValues.Position.Relative,
      width: StyleValues.Length.Zero,
      height: StyleValues.Length.Zero,
    });

    this.rootNode.requestUpdates = () => {
      this.requestUpdates();
    };

    this.rootNode.styleManager.addRuleset(this.rootStyle);

    // Bind the listeners that will convert the "mousemove" events into "mouseover" / "mouseout" / "mouseenter" / "mouseleave"
    this.rootNode.onMouseMove.addEventListener(e => this.dispatchMouseOverEvents(e), {capture: true});
    this.rootNode.onMouseMove.addEventListener(e => this.dispatchMouseEnterEvents(e), {capture: true});

    this.rootNode.addShortcutListener(`C-c`, () => this.terminate(), {capture: true});
  }

  async run(opts: RunOptions, fn: () => void | undefined) {
    this.attachScreen(opts);

    return new Promise<number>(resolve => {
      this.resolve = resolve;
      fn();
    }).finally(async () => {
      await this.triggerCleanup();
      await this.detachScreen();
      this.resolve = undefined;
    });
  }

  terminate(exitCode: number = 0) {
    if (typeof this.resolve === `undefined`)
      throw new Error(`Cannot terminate a process that hasn't started`);

    this.resolve(exitCode);
  }

  private triggerCleanup() {
    for (const element of this.rootNode.renderList) {
      element.cleanup();
    }
  }

  private requestUpdates() {
    if (this.updateTimer)
      return;

    this.updateTimer = rafFn(() => {
      this.updateTimer = null;
      this.renderScreen();
    });
  }

  private attachScreen({
    stdin = process.stdin,
    stdout = process.stdout,

    trackOutputSize = true,
    throttleMouseMoveEvents = 1000 / 60,
  }: RunOptions = {}) {
    this.stdin = stdin;
    this.stdout = stdout;

    this.trackOutputSize = trackOutputSize;

    // Automatically clear the screen when the program exits
    process.on(`uncaughtException`, this.handleException);
    process.on(`exit`, this.handleExit);

    const observable = new Observable<Array<number>>(observer => {
      stdin.addListener(`data`, buffer => {
        observer.next([...buffer]);
      });

      stdin.addListener(`error`, error => {
        observer.error(error);
      });

      stdin.addListener(`close`, () => {
        observer.complete();
      });
    });

    // Listen for input events
    this.subscription = parseTerminalInputs(observable, {
      throttleMouseMoveEvents,
    }).subscribe({
      next: this.handleInput,
    });

    // Automatically resize the screen when its output changes
    if (this.trackOutputSize) {
      this.rootStyle.set({
        width: typeof this.stdout.columns !== `undefined` ? length(this.stdout.columns) : StyleValues.Length.AutoNaN,
        height: typeof this.stdout.rows !== `undefined` ? length(this.stdout.rows) : StyleValues.Length.AutoNaN,
      });

      this.stdout.addListener(`resize`, this.handleStdoutResize);
    }

    // If we can operate in raw mode, we do
    if (this.stdin.setRawMode)
      this.stdin.setRawMode(true);

    const payload: Array<string> = [];

    // Enter the alternate screen
    payload.push(screen.alternateScreen.in);

    // Disable the terminal soft wrapping
    payload.push(screen.noWrap.in);

    // Hide the cursor (it will be renderer with everything else later)
    payload.push(cursor.hidden);

    // Enable mouse tracking (all events are tracked, even when the mouse button isn't pressed)
    payload.push(feature.enableMouseHoldTracking.in);
    payload.push(feature.enableMouseMoveTracking.in);
    payload.push(feature.enableExtendedCoordinates.in);

    // Clear the current font style so that we aren't polluted by previous applications
    payload.push(style.clear);

    payload.push(request.screenBackgroundColor);

    if (this.clearColor)
      payload.push(style.color.screen(this.clearColor));

    this.stdout.write(payload.join(``));

    // Finally schedule the first update of the screen
    this.requestUpdates();
  }

  private async detachScreen() {
    const payload: Array<string> = [];

    if (this.originalClearColor && this.clearColor)
      payload.push(style.color.screen(this.originalClearColor));

    // Disable the various mouse tracking modes
    payload.push(feature.enableExtendedCoordinates.out);
    payload.push(feature.enableMouseMoveTracking.out);
    payload.push(feature.enableMouseHoldTracking.out);

    // Display the cursor back
    payload.push(cursor.normal);

    // Exit the alternate screen
    payload.push(screen.alternateScreen.out);

    this.stdout?.write(payload.join(``));

    if (this.stdin?.setRawMode)
      this.stdin?.setRawMode(false);

    this.stdin?.pause();

    // Stop resizing the screen
    if (this.trackOutputSize) {
      this.rootStyle.set({
        width: StyleValues.Length.Zero,
        height: StyleValues.Length.Zero,
      });

      this.stdout?.removeListener(`resize`, this.handleStdoutResize);
    }

    // Stop listening for events from the input stream
    this.subscription?.unsubscribe();
    this.subscription = null;

    // Remove the exit hooks, since the screen is already closed
    process.removeListener(`uncaughtException`, this.handleException);
    process.removeListener(`exit`, this.handleExit);

    this.trackOutputSize = false;

    this.stdin = null;
    this.stdout = null;
  }

  setClearColor(color: string | null) {
    if (this.clearColor === color)
      return;

    this.clearColor = color;

    if (this.stdout) {
      if (color) {
        this.stdout.write(style.color.screen(color));
      } else if (this.originalClearColor) {
        this.stdout.write(style.color.screen(this.originalClearColor));
      }
    }
  }

  dispatchMouseOverEvents(e: EventOf<TermElement[`onMouseMove`]>) {
    const targetElement = this.getElementAt(e.attributes.worldCoordinates);

    if (targetElement === this.mouseOverElement)
      return;

    if (this.mouseOverElement)
      this.mouseOverElement.onMouseOver.dispatchEvent(e.attributes);

    this.mouseOverElement = targetElement;

    if (this.mouseOverElement) {
      this.mouseOverElement.onMouseOver.dispatchEvent(e.attributes);
    }
  }

  dispatchMouseEnterEvents(e: EventOf<TermElement[`onMouseMove`]>) {
    const targetElement = this.getElementAt(e.attributes.worldCoordinates);
    const index = this.mouseEnterElements.indexOf(targetElement!);

    let removedElements = [];
    const addedElements = [];

    if (index !== -1) {
      removedElements = this.mouseEnterElements.splice(index + 1, this.mouseEnterElements.length);
    } else {
      let currentElement = targetElement;
      let currentIndex = index;

      while (currentElement && currentIndex === -1) {
        addedElements.unshift(currentElement);

        currentElement = currentElement.parentNode;
        currentIndex = this.mouseEnterElements.indexOf(currentElement!);
      }

      if (currentElement) {
        removedElements = this.mouseEnterElements.splice(currentIndex + 1, this.mouseEnterElements.length);
      } else {
        removedElements = this.mouseEnterElements.splice(0, this.mouseEnterElements.length);
      }
    }

    this.mouseEnterElements = this.mouseEnterElements.concat(addedElements);

    for (let t = removedElements.length - 1; t >= 0; --t) {
      removedElements[t].onMouseLeave.dispatchEvent(e.attributes, {
        bubbles: false,
      });
    }

    for (let t = 0; t < addedElements.length; ++t) {
      addedElements[t].onMouseEnter.dispatchEvent(e.attributes, {
        bubbles: false,
      });
    }
  }

  getElementAt(position: Point) {
    this.rootNode.triggerUpdates();

    for (const element of this.rootNode.renderList) {
      if (!element.elementClipRect)
        continue;

      if (position.x < element.elementClipRect.x || position.x >= element.elementClipRect.x + element.elementClipRect.w)
        continue;
      if (position.y < element.elementClipRect.y || position.y >= element.elementClipRect.y + element.elementClipRect.h)
        continue;

      return element;
    }

    return null;
  }

  renderScreen() {
    if (this.updateTimer !== null) {
      clearFn(this.updateTimer as any);
      this.updateTimer = null;
    }

    this.rootNode.triggerUpdates();

    this.renderScreenImpl(this.rootNode.flushDirtyRects());
  }

  renderScreenImpl(dirtyRects: Array<Rect> = this.rootNode.elementClipRect ? [this.rootNode.elementClipRect] : []) {
    let buffer = cursor.hidden;

    const debugColor = DEBUG_COLORS[currentDebugColorIndex];
    currentDebugColorIndex = (currentDebugColorIndex + 1) % DEBUG_COLORS.length;

    while (dirtyRects.length > 0) {
      const dirtyRect = dirtyRects.shift()!;

      for (const element of this.rootNode.renderList) {
        if (!element.elementClipRect)
          continue;

        const intersection = getIntersectingRect([element.elementClipRect, dirtyRect]);
        if (!intersection)
          continue;

        const truncation = substractRect(dirtyRect, intersection);
        dirtyRects.unshift(...truncation);

        for (let y = 0, Y = intersection.h; y < Y; ++y) {
          const relativeX = intersection.x - element.elementWorldRect.x;
          const relativeY = intersection.y - element.elementWorldRect.y + y ;

          let line = String(element.renderElement(relativeX, relativeY, intersection.w));

          if (this.rootNode.debugPaintRects)
            line = style.color.back(debugColor) + line + style.clear;

          buffer += cursor.moveTo({x: intersection.x, y: intersection.y + y});
          buffer += line;
        }

        break;
      }
    }

    if (this.rootNode.activeElement && this.rootNode.activeElement.contentClipRect && this.rootNode.activeElement.caret) {
      const x = this.rootNode.activeElement.contentWorldRect.x - this.rootNode.activeElement.scrollRect.x + this.rootNode.activeElement.caret.x;
      const y = this.rootNode.activeElement.contentWorldRect.y - this.rootNode.activeElement.scrollRect.y + this.rootNode.activeElement.caret.y;

      if (x >= this.rootNode.activeElement.contentClipRect.x && x < this.rootNode.activeElement.contentClipRect.x + this.rootNode.activeElement.contentClipRect.w && y >= this.rootNode.activeElement.contentClipRect.y && y < this.rootNode.activeElement.contentClipRect.y + this.rootNode.activeElement.contentClipRect.h) {
        const visibleElement = this.getElementAt({x, y});

        if (visibleElement === this.rootNode.activeElement) {
          buffer += cursor.moveTo({x, y});
          buffer += cursor.normal;
        }
      }
    }

    this.stdout?.write(buffer);
  }

  handleException = (exception: Error) => {
    this.detachScreen();

    process.stderr.write(exception.stack ?? ``);
    process.exit(1);
  };

  handleExit = () => {
    this.detachScreen();
  };

  handleInput = (input: Production) => {
    switch (input.type) {
      case `info`: {
        this.handleInfo(input);
      } break;

      case `key`: {
        this.handleKey(input);
      } break;

      case `mouse`: {
        this.handleMouse(input);
      } break;

      case `data`: {
        this.handleData(input.buffer);
      }
    }
  };

  handleInfo(info: Info) {
    switch (info.name) {
      case `screenBackgroundColor`: {
        this.originalClearColor = info.color;
      } break;
    }
  }

  handleKey(key: Key) {
    const event = {key};

    if (this.rootNode.activeElement) {
      this.rootNode.activeElement.onKeyPress.dispatchEvent(event);
    } else {
      this.rootNode.onKeyPress.dispatchEvent(event);
    }
  }

  handleMouse(mouse: Mouse) {
    const worldCoordinates = {x: mouse.x, y: mouse.y};

    const targetElement = this.getElementAt(worldCoordinates);
    if (!targetElement)
      return; // Some envs (xterm.js) sometimes send mouse coordinates outside of the possible range

    const contentCoordinates = {
      x: worldCoordinates.x - targetElement.contentWorldRect.x,
      y: worldCoordinates.y - targetElement.contentWorldRect.y + targetElement.scrollRect.y,
    };

    const event = {
      mouse,
      worldCoordinates,
      contentCoordinates,
    };

    if (mouse.name === `wheel`) {
      targetElement.onMouseWheel.dispatchEvent(event);
    } else {
      if (mouse.start)
        targetElement.onMouseDown.dispatchEvent(event);

      if (mouse.end)
        targetElement.onMouseUp.dispatchEvent(event);

      if (!mouse.start && !mouse.end) {
        targetElement.onMouseMove.dispatchEvent(event);
      }
    }
  }

  handleData(data: Uint8Array) {
    const asString = decoder.decode(data);

    const emitData = () => {
      if (this.rootNode.activeElement) {
        this.rootNode.activeElement.onData.dispatchEvent({data});
      } else {
        this.rootNode.onData.dispatchEvent({data});
      }
    };

    if (asString.length === 1) {
      const key = new Key(asString, asString);
      const action = () => emitData();

      if (this.rootNode.activeElement) {
        this.rootNode.activeElement.onKeyPress.dispatchEvent({key}, {action});
      } else {
        this.rootNode.onKeyPress.dispatchEvent({key}, {action});
      }
    } else {
      emitData();
    }
  }

  handleStdoutResize = () => {
    const width = typeof this.stdout?.columns !== `undefined`
      ? length(this.stdout?.columns)
      : StyleValues.Length.AutoNaN;

    const height = typeof this.stdout?.rows !== `undefined`
      ? length(this.stdout?.rows)
      : StyleValues.Length.AutoNaN;

    this.rootStyle.set({width, height});
  };
}
