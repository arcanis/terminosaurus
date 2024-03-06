import {TextLayout}                                                                         from 'mono-layout';
import {Key, Mouse}                                                                         from 'term-strings/parse';
import {style}                                                                              from 'term-strings';
import Yoga, {YogaMeasureMode, YogaNode}                                                    from 'yogini';

import {createNode}                                                                         from '#sources/deps/yoga';
import {TermNode}                                                                           from '#sources/dom/TermNode';
import {ElementFlags}                                                                       from '#sources/dom/flags';
import {isChildOf}                                                                          from '#sources/dom/traverse';
import {EventOf, EventSlot}                                                                 from '#sources/misc/EventSource';
import {KeySequence}                                                                        from '#sources/misc/KeySequence';
import {Point}                                                                              from '#sources/misc/Point';
import {compareRects, emptyRect, getBoundingRect, getIntersectingRect, Rect, substractRect} from '#sources/misc/Rect';
import {Ruleset}                                                                            from '#sources/style/Ruleset';
import {StyleManager}                                                                       from '#sources/style/StyleManager';
import {StyleValues}                                                                        from '#sources/style/StyleValues';

function getPreferredSize(node: TermElement, width: number, widthMeasureMode: YogaMeasureMode, height: number, heightMeasureMode: YogaMeasureMode) {
  const min: Point = {
    x: widthMeasureMode === Yoga.MEASURE_MODE_EXACTLY ? width : 0,
    y: heightMeasureMode === Yoga.MEASURE_MODE_EXACTLY ? height : 0,
  };

  const max: Point = {
    x: widthMeasureMode === Yoga.MEASURE_MODE_UNDEFINED ? 0xffffffff : width,
    y: heightMeasureMode === Yoga.MEASURE_MODE_UNDEFINED ? 0xffffffff : height,
  };

  const {x, y} = node.getPreferredSize(min, max);
  return {width: x, height: y};
}

export type ScrollIntoViewOptions = {
  align?: `auto` | `start` | `end`;
  alignX?: `auto` | `start` | `end`;
  alignY?: `auto` | `start` | `end`;
  force?: boolean;
  forceX?: boolean;
  forceY?: boolean;
};

export class TermElement extends TermNode<TermElement> {
  private updateInProgress = false;

  public flags = 0
    | ElementFlags.ELEMENT_HAS_DIRTY_NODE_LIST
    | ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT;

  public yoga: YogaNode;
  public textLayout: TextLayout | null = null;

  public styleManager: StyleManager;
  public style: Ruleset;

  public propMap = new Map<number, string>();
  public activeProps = new Set<number>();

  public dirtyRects: Array<Rect> = [];
  public pendingEvents: Array<Rect> = [];

  public nodeList: Array<TermElement> = [];
  public focusList: Array<TermElement> = [];
  public renderList: Array<TermElement> = [];

  public activeElement: TermElement | null = null;
  public isActive = false;

  // Position & size of the whole element inside its parent
  public elementRect: Rect = {...emptyRect};
  // Position & size of the content box inside the element
  public contentRect: Rect = {...emptyRect};
  // Position & size of the element children box | note: both `x` and `y` are "wrong", in that they are not the actual box offset (which would always be 0;0), but rather the scroll offset (ie = scrollLeft / scrollTop)
  public scrollRect: Rect = {...emptyRect};

  // Position & size of the element inside the viewport
  public elementWorldRect: Rect = {...emptyRect};
  // Position & size of the element content inside the viewport
  public contentWorldRect: Rect = {...emptyRect};

  // Position & size of the actual visible box inside the element
  public elementClipRect: Rect | null = null;
  // Position & size of the actual visible box inside the element
  public contentClipRect: Rect | null = null;

  // Position & size of the visible box that contains both the element itself and each of its children
  public elementBoundingRect: Rect | null = null;

  // After the element has been layouted, but before it is rendered. Modifying the layout during this event will result in a new layout pass, but no extra rendering.
  public onLayout = new EventSlot(this as TermElement, `onLayout`, {});

  // After the element acquired the focus.
  public onFocus = new EventSlot(this as TermElement, `onFocus`, {} as {
    was: TermElement | null;
  });

  // After the element lost the focus.
  public onBlur = new EventSlot(this as TermElement, `onBlur`, {});

  // After the element scroll position has changed.
  public onScroll = new EventSlot(this as TermElement, `onScroll`, {});

  // After the element caret position has changed.
  public onCaret = new EventSlot(this as TermElement, `onCaret`, {});

  public onData = new EventSlot(this as TermElement, `onData`, {} as {
    data: Uint8Array;
  });

  public onKeyPress = new EventSlot(this as TermElement, `onKeyPress`, {} as {
    key: Key;
  });

  public onMouseMove = new EventSlot(this as TermElement, `onMouseMove`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseWheel = new EventSlot(this as TermElement, `onMouseWheel`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseDown = new EventSlot(this as TermElement, `onMouseDown`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseUp = new EventSlot(this as TermElement, `onMouseUp`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseOver = new EventSlot(this as TermElement, `onMouseOver`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseOut = new EventSlot(this as TermElement, `onMouseOut`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseEnter = new EventSlot(this as TermElement, `onMouseEnter`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onMouseLeave = new EventSlot(this as TermElement, `onMouseLeave`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  public onClick = new EventSlot(this as TermElement, `onClick`, {} as {
    mouse: Mouse;

    worldCoordinates: Point;
    contentCoordinates: Point;
  });

  constructor({textLayout = null}: {textLayout?: TextLayout | null} = {}) {
    super();

    this.yoga = createNode();
    this.yoga.setMeasureFunc(getPreferredSize.bind(null, this));

    this.textLayout = textLayout;

    this.styleManager = new StyleManager(this);
    this.style = this.styleManager.localRuleset;

    this.styleManager.initialize();
    this.styleManager.setStateStatus(`firstChild`, true);
    this.styleManager.setStateStatus(`lastChild`, true);

    this.onMouseWheel.addEventListener(e => {
      if (this.scrollHeight === this.offsetHeight)
        return;

      e.action = () => {
        this.scrollTop += e.attributes.mouse.d * 2;
      };
    }, {capture: true});

    this.onMouseEnter.addEventListener(e => {
      this.styleManager.setStateStatus(`hover`, true);

      if (this.isActive) {
        this.styleManager.setStateStatus(`active`, true);
      }
    });

    this.onMouseLeave.addEventListener(e => {
      this.styleManager.setStateStatus(`hover`, false);

      if (this.isActive) {
        this.styleManager.setStateStatus(`active`, false);
      }
    });

    this.onMouseDown.addEventListener(e => {
      if (e.attributes.mouse.name !== `left`)
        return;

      this.styleManager.setStateStatus(`active`, true);
      this.isActive = true;

      if (!this.styleManager.computed.focusEvents)
        return;

      e.action = () => {
        this.focus();
      };
    }, {capture: true});

    this.onMouseUp.addEventListener(e => {
      if (e.attributes.mouse.name !== `left`)
        return;

      if (this.rootNode.isActive) {
        let element = this.rootNode;

        disableLoop: while (element) {
          element.styleManager.setStateStatus(`active`, false);
          element.isActive = false;

          for (const child of element.childNodes) {
            if (!child.isActive)
              continue;

            element = child;
            continue disableLoop;
          }

          break;
        }
      }

      e.action = () => {
        this.onClick.dispatchEvent(e.attributes);
      };
    }, {capture: true});
  }

  #debugPaintRects = false;

  get debugPaintRects() {
    return this.#debugPaintRects;
  }

  set debugPaintRects(status: boolean) {
    this.#debugPaintRects = status;
    this.queueDirtyRect();
  }

  #caret: Point | null = null;

  get caret() {
    return this.#caret;
  }

  set caret(caret: Point | null) {
    this.#caret = caret;
    this.rootNode.requestUpdates();
  }

  get decorated() {
    return this.styleManager.getStateStatus(`decorated`);
  }

  getDebugInfo() {
    return {
      name: this.constructor.name,

      contentRect: this.contentRect,
      elementRect: this.elementRect,

      elementWorldRect: this.elementWorldRect,
      contentWorldRect: this.contentWorldRect,

      elementClipRect: this.elementClipRect,
      contentClipRect: this.contentClipRect,
    };
  }

  cleanup() {
  }

  resetDecorated() {
    this.setDecorated(false);
  }

  setDecorated(value: boolean) {
    this.styleManager.setStateStatus(`decorated`, value);
  }

  linkBefore(node: TermElement, referenceNode: TermElement | null) {
    node.flushDirtyRects();

    super.linkBefore(node, referenceNode);

    if (node.previousSibling) {
      node.previousSibling.styleManager.setStateStatus(`lastChild`, false);
      node.styleManager.setStateStatus(`firstChild`, false);
    }

    if (node.nextSibling) {
      node.nextSibling.styleManager.setStateStatus(`firstChild`, false);
      node.styleManager.setStateStatus(`lastChild`, false);
    }

    this.yoga.unsetMeasureFunc();
    this.yoga.insertChild(node.yoga, this.childNodes.indexOf(node));

    this.setDirtyLayoutFlag();
    this.setDirtyClippingFlag();

    this.rootNode.setDirtyNodeListFlag();
    this.rootNode.setDirtyFocusListFlag();
    this.rootNode.setDirtyRenderListFlag();

    node.clearDirtyNodeListFlag();
    node.clearDirtyRenderListFlag();

    node.styleManager.refresh(node.styleManager.inherited);
  }

  removeChild(node: TermElement) {
    const previousSibling = this.previousSibling;
    const nextSibling = this.nextSibling;

    super.removeChild(node);

    if (previousSibling)
      previousSibling.styleManager.setStateStatus(`lastChild`, !nextSibling);
    if (nextSibling)
      nextSibling.styleManager.setStateStatus(`firstChild`, !previousSibling);

    node.styleManager.setStateStatus(`firstChild`, true);
    node.styleManager.setStateStatus(`lastChild`, true);

    this.yoga.removeChild(node.yoga);

    if (this.childNodes.length === 0)
      this.yoga.setMeasureFunc(getPreferredSize.bind(null, this));

    this.setDirtyLayoutFlag();
    this.setDirtyClippingFlag();

    this.rootNode.setDirtyNodeListFlag();
    this.rootNode.setDirtyFocusListFlag();
    this.rootNode.setDirtyRenderListFlag();

    node.setDirtyLayoutFlag();
    node.setDirtyClippingFlag();

    node.setDirtyNodeListFlag();
    node.setDirtyFocusListFlag();
    node.setDirtyRenderListFlag();

    // We need to manually register this rect because since the element will be removed from the tree, we will never iterate over it at the next triggerUpdates
    this.rootNode.queueDirtyRect(node.elementBoundingRect);

    node.styleManager.refresh(node.styleManager.inherited);

    // It's a bit wtf: when an active element is removed from the tree, we need to trigger a blur event.
    // The problem is that since we've already removed the node from the dom at this point! So we need to "fake" the parent node in order to cascade the event on the correct tree branch.
    if (this.rootNode.activeElement && (this.rootNode.activeElement === node || isChildOf(this.rootNode.activeElement, node))) {
      this.rootNode.activeElement.onBlur.dispatchEvent({}, {parentNode: this});
    }
  }

  setDirtyNodeListFlag() {
    this.setDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_NODE_LIST);
  }

  clearDirtyNodeListFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_NODE_LIST);
  }

  setDirtyFocusListFlag() {
    this.setDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_FOCUS_LIST);
  }

  clearDirtyFocusListFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_FOCUS_LIST);
  }

  setDirtyRenderListFlag() {
    this.setDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_RENDER_LIST);
  }

  clearDirtyRenderListFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_RENDER_LIST);
  }

  setDirtyLayoutFlag() {
    this.setDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT, ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT_CHILDREN);
  }

  clearDirtyLayoutFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT);
  }

  clearDirtyLayoutChildrenFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT_CHILDREN);
  }

  setDirtyClippingFlag() {
    this.setDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING, ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING_CHILDREN);
  }

  clearDirtyClippingFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING);
  }

  clearDirtyClippingChildrenFlag() {
    this.clearDirtyFlag(ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING_CHILDREN);
  }

  setDirtyFlag(flag: ElementFlags, parentFlag: ElementFlags | 0 = 0) {
    if (this.flags & flag)
      return;

    this.flags |= flag;

    if (parentFlag !== 0) {
      let parent = this.parentNode;

      while (parent && !(parent.flags & parentFlag)) {
        parent.flags |= parentFlag;
        parent = parent.parentNode;
      }
    }

    if (!this.rootNode.updateInProgress) {
      this.rootNode!.requestUpdates();
    }
  }

  clearDirtyFlag(flag: ElementFlags) {
    this.flags &= ~flag;
  }

  queueDirtyRect(dirtyRect: Rect | null = this.elementClipRect, checkIntersectionFrom: number = 0) {
    if (dirtyRect === null || dirtyRect.w === 0 || dirtyRect.h === 0)
      return;

    if (this.rootNode !== this) {
      this.rootNode?.queueDirtyRect(this.elementClipRect !== null ? getIntersectingRect([dirtyRect, this.elementClipRect]) : null, checkIntersectionFrom);
      return;
    }

    const intersectorIndex = this.dirtyRects.findIndex(other => {
      return getIntersectingRect([dirtyRect, other]);
    });

    if (intersectorIndex !== -1)
      this.queueDirtyRects(substractRect(dirtyRect, this.dirtyRects[intersectorIndex]), intersectorIndex + 1);
    else
      this.dirtyRects.push(dirtyRect);

    if (!this.rootNode.updateInProgress) {
      this.rootNode!.requestUpdates();
    }
  }

  queueDirtyRects(dirtyRects: Array<Rect>, checkIntersectionFrom: number = 0) {
    for (const dirtyRect of dirtyRects) {
      this.queueDirtyRect(dirtyRect, checkIntersectionFrom);
    }
  }

  flushDirtyRects() {
    if (this.rootNode !== this)
      throw new Error(`Failed to execute 'queueDirtyRect': This function can only be called from a root node.`);

    const dirtyRects = this.dirtyRects;
    this.dirtyRects = [];

    return dirtyRects;
  }

  requestUpdates() {
    // The default implementation doesn't do anything; triggerUpdates has to be called manually.
    // However, it is expected that renderer will override this function and call triggerUpdates themselves.

    // Note that calling triggerUpdates synchronously isn't advised: the requestUpdates function might get called multiple times in the same execution list.
    // For this reason, prefer using setImmediate, requestAnimationFrame, or setTimeout in order to schedule an update later on.
  }

  triggerUpdates({maxDepth = 5} = {}) {
    if (this.rootNode !== this) {
      this.rootNode.triggerUpdates();
      return;
    }

    this.updateInProgress = true;
    try {
      this.triggerUpdatesFromHere();
    } finally {
      this.updateInProgress = false;
    }

    if (this.flags & ElementFlags.ELEMENT_DIRTY_MASK) {
      if (maxDepth < 1) {
        throw new Error(`Aborted 'triggerUpdates' execution: Too much recursion.`);
      } else {
        this.triggerUpdates({maxDepth: maxDepth - 1});
      }
    }
  }

  triggerUpdatesFromHere() {
    const needsFullRerender = this.flags & (
      ElementFlags.ELEMENT_HAS_DIRTY_NODE_LIST |
      ElementFlags.ELEMENT_HAS_DIRTY_RENDER_LIST
    );

    if (this.flags & ElementFlags.ELEMENT_HAS_DIRTY_NODE_LIST) {
      this.nodeList = this.generateNodeList();
      this.clearDirtyNodeListFlag();
    }

    if (this.flags & ElementFlags.ELEMENT_HAS_DIRTY_FOCUS_LIST) {
      this.focusList = this.generateFocusList();
      this.clearDirtyFocusListFlag();
    }

    if (this.flags & ElementFlags.ELEMENT_HAS_DIRTY_RENDER_LIST) {
      this.renderList = this.generateRenderList();
      this.clearDirtyRenderListFlag();
    }

    const dirtyLayoutNodes: Array<TermElement> = [];
    const dirtyScrollNodes: Array<TermElement> = [];

    if (this.flags & (ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT | ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT_CHILDREN)) {
      this.yoga.calculateLayout();
      this.cascadeLayout({dirtyLayoutNodes});
    }

    if (this.flags & (ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING | ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING_CHILDREN))
      this.cascadeClipping({dirtyScrollNodes});

    if (this.flags & ElementFlags.ELEMENT_DIRTY_MASK)
      throw new Error(`Aborted 'triggerUpdates' execution: Flags have not been correctly reset at some point (0b${(this.flags & ElementFlags.ELEMENT_DIRTY_MASK).toString(2).padStart(16, `0`)}).`);

    for (const dirtyLayoutNode of dirtyLayoutNodes)
      dirtyLayoutNode.onLayout.dispatchEvent({});

    for (const dirtyScrollNode of dirtyScrollNodes)
      dirtyScrollNode.onScroll.dispatchEvent({});

    if (needsFullRerender) {
      this.queueDirtyRect();
    }
  }

  generateNodeList() {
    const nodeList: Array<TermElement> = [];
    const traverseList: Array<TermElement> = [this];

    while (traverseList.length !== 0) {
      const element = traverseList.shift()!;
      nodeList.push(element);

      traverseList.unshift(...element.childNodes);
    }

    return nodeList;
  }

  generateFocusList() {
    const focusList: Array<TermElement> = [];

    this.styleManager.computed.focusEvents;

    for (const node of this.nodeList)
      if (node.styleManager.computed.focusEvents)
        focusList.push(node);

    return focusList;
  }

  generateRenderList() {
    const renderList: Array<TermElement> = [];
    const stackingContexts: Array<TermElement> = [this];

    while (stackingContexts.length > 0) {
      const stackingContext = stackingContexts.shift()!;
      renderList.push(stackingContext);

      const childNodes = stackingContext.childNodes.slice();
      const subContexts: Array<TermElement> = [];

      while (childNodes.length > 0) {
        const child = childNodes.shift()!;

        if (child.styleManager.computed.zIndex !== null) {
          subContexts.push(child);
        } else if (child.styleManager.computed.position.isAbsolutelyPositioned) {
          subContexts.push(child);
        } else {
          renderList.push(child);
          childNodes.splice(0, 0, ...child.childNodes);
        }
      }

      stackingContexts.splice(0, 0, ...subContexts.sort((a, b) => {
        return (a.styleManager.computed.zIndex ?? 0) - (b.styleManager.computed.zIndex ?? 0);
      }));
    }

    renderList.reverse();

    return renderList;
  }

  cascadeLayout({dirtyLayoutNodes, force = false}: {dirtyLayoutNodes: Array<TermElement>, force?: boolean}) {
    if (force || this.flags & (ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT | ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT_CHILDREN)) {
      let doesLayoutChange = false;
      let doesScrollChange = false;

      if (force || this.flags & ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT) {
        const prevElementRect = {...this.elementRect};
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const prevContentRect = {...this.contentRect};

        this.elementRect.x = this.yoga.getComputedLeft();
        this.elementRect.y = this.yoga.getComputedTop();

        this.elementRect.w = this.yoga.getComputedWidth();
        this.elementRect.h = this.yoga.getComputedHeight();

        // We try to optimize away the iterations inside elements that haven't changed and aren't marked as dirty, because we know their children's layouts won't change either
        doesLayoutChange = !compareRects(this.elementRect, prevElementRect);
      }

      if (this.flags & (ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT | ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT_CHILDREN) || doesLayoutChange) {
        for (const child of this.childNodes)
          child.cascadeLayout({dirtyLayoutNodes, force: true});

        const prevScrollWidth = this.scrollRect.w;
        const prevScrollHeight = this.scrollRect.h;

        this.scrollRect.w = Math.max(this.elementRect.w, this.getInternalContentWidth(), ...this.childNodes.map(child => {
          return child.elementRect.x + child.elementRect.w;
        }));

        this.scrollRect.h = Math.max(this.elementRect.h, this.getInternalContentHeight(), ...this.childNodes.map(child => {
          return child.elementRect.y + child.elementRect.h;
        }));

        this.contentRect.x = this.yoga.getComputedBorder(Yoga.EDGE_LEFT) + this.yoga.getComputedPadding(Yoga.EDGE_LEFT);
        this.contentRect.y = this.yoga.getComputedBorder(Yoga.EDGE_TOP) + this.yoga.getComputedPadding(Yoga.EDGE_TOP);

        this.contentRect.w = this.scrollRect.w - this.contentRect.x - this.yoga.getComputedBorder(Yoga.EDGE_RIGHT) - this.yoga.getComputedPadding(Yoga.EDGE_RIGHT);
        this.contentRect.h = this.scrollRect.h - this.contentRect.y - this.yoga.getComputedBorder(Yoga.EDGE_BOTTOM) - this.yoga.getComputedPadding(Yoga.EDGE_BOTTOM);

        doesScrollChange = this.scrollRect.w !== prevScrollWidth || this.scrollRect.h !== prevScrollHeight;
      }

      if (this.flags & ElementFlags.ELEMENT_HAS_DIRTY_LAYOUT || doesLayoutChange || doesScrollChange) {
        this.rootNode.queueDirtyRect(this.elementClipRect);

        // We register this node so that we can emit the "postlayout" event once the layout process has been completed
        dirtyLayoutNodes.push(this);

        this.setDirtyClippingFlag();
      }

      this.clearDirtyLayoutFlag();
      this.clearDirtyLayoutChildrenFlag();
    }
  }

  cascadeClipping({dirtyScrollNodes, relativeClipRect = null, force = false}: {dirtyScrollNodes: Array<TermElement>, relativeClipRect?: Rect | null, force?: boolean}) {
    if (force || this.flags & (ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING | ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING_CHILDREN)) {
      if (force || this.flags & ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING) {
        let doesClippingChange = false;
        let doesScrollChange = false;

        const prevScrollX = this.scrollRect.x;
        const prevScrollY = this.scrollRect.y;

        if (!this.styleManager.computed.overflow.doesHideOverflow) {
          this.scrollRect.x = Math.min(this.scrollRect.x, this.scrollRect.w - this.elementRect.w);
          this.scrollRect.y = Math.min(this.scrollRect.y, this.scrollRect.h - this.elementRect.h);
        } else {
          this.scrollRect.x = 0;
          this.scrollRect.y = 0;
        }

        doesScrollChange = this.scrollRect.x !== prevScrollX || this.scrollRect.y !== prevScrollY;

        if (doesScrollChange)
          dirtyScrollNodes.push(this);

        const parentScrollX = this.parentNode && this.styleManager.computed.position.isScrollAware
          ? this.parentNode.scrollRect.x
          : 0;

        const parentScrollY = this.parentNode && this.styleManager.computed.position.isScrollAware
          ? this.parentNode.scrollRect.y
          : 0;

        const prevElementWorldRect = {...this.elementWorldRect};

        this.elementWorldRect.x = this.parentNode ? this.parentNode.elementWorldRect.x + this.elementRect.x - parentScrollX : 0;
        this.elementWorldRect.y = this.parentNode ? this.parentNode.elementWorldRect.y + this.elementRect.y - parentScrollY : 0;

        this.elementWorldRect.w = this.elementRect.w;
        this.elementWorldRect.h = this.elementRect.h;

        const prevContentWorldRect = {...this.contentWorldRect};

        this.contentWorldRect.x = this.elementWorldRect.x + this.contentRect.x;
        this.contentWorldRect.y = this.elementWorldRect.y + this.contentRect.y;

        this.contentWorldRect.w = this.contentRect.w;
        this.contentWorldRect.h = this.contentRect.h;

        const prevElementClipRect = this.elementClipRect
          ? {...this.elementClipRect}
          : null;

        this.elementClipRect = relativeClipRect
          ? getIntersectingRect([this.elementWorldRect, relativeClipRect])
          : this.elementWorldRect;

        this.contentClipRect = relativeClipRect
          ? getIntersectingRect([this.contentWorldRect, relativeClipRect])
          : this.contentWorldRect;

        doesClippingChange =
          !compareRects(prevElementWorldRect, this.elementWorldRect) ||
          !compareRects(prevContentWorldRect, this.contentWorldRect) ||
          !compareRects(prevElementClipRect ?? emptyRect, this.elementClipRect ?? emptyRect);

        if (doesClippingChange || doesScrollChange) {
          if (doesClippingChange)
            this.rootNode.queueDirtyRect(prevElementClipRect);

          this.rootNode.queueDirtyRect(this.elementClipRect);
        }
      }

      if (this.styleManager.computed.overflow.doesHideOverflow || !relativeClipRect) {
        relativeClipRect = {...this.elementClipRect!};

        if (this.styleManager.computed.borderRightCharacter)
          relativeClipRect.w -= 1;

        if (this.styleManager.computed.borderBottomCharacter) {
          relativeClipRect.h -= 1;
        }
      }

      for (const child of this.childNodes)
        child.cascadeClipping({dirtyScrollNodes, relativeClipRect, force: force || !!(this.flags & ElementFlags.ELEMENT_HAS_DIRTY_CLIPPING)});

      this.elementBoundingRect = getBoundingRect([this.elementClipRect ?? emptyRect, ...this.childNodes.map(child => child.elementBoundingRect ?? emptyRect)]);

      this.clearDirtyClippingFlag();
      this.clearDirtyClippingChildrenFlag();
    }
  }

  getPreferredSize(min: Point, max: Point): Point {
    return {x: max.x, y: 0};
  }

  getInternalContentWidth() {
    return 0;
  }

  getInternalContentHeight() {
    return 0;
  }

  renderElement(x: number, y: number, l: number) {
    const processBorders = (x: number, y: number, l: number) => {
      let prepend = ``;
      let append = ``;

      if (y === 0 && this.styleManager.computed.borderTopCharacter) {
        let contentL = l;

        if (x === 0 && this.styleManager.computed.borderLeftCharacter) {
          prepend = this.styleManager.computed.borderTopLeftCharacter ?? this.styleManager.computed.borderLeftCharacter;
          contentL -= 1;
        }

        if (x + l === this.elementRect.w && this.styleManager.computed.borderRightCharacter) {
          append = this.styleManager.computed.borderTopRightCharacter ?? this.styleManager.computed.borderRightCharacter;
          contentL -= 1;
        }

        let data = prepend + this.styleManager.computed.borderTopCharacter.repeat(contentL) + append;

        if (!this.rootNode.debugPaintRects && this.styleManager.computed.backgroundColor && this.styleManager.computed.backgroundClip.doesIncludeBorders)
          data = this.styleManager.computed.backgroundColor.back + data;

        if (!this.rootNode.debugPaintRects && this.styleManager.computed.borderColor)
          data = this.styleManager.computed.borderColor.front + data;

        if (!this.rootNode.debugPaintRects && ((this.styleManager.computed.backgroundColor && this.styleManager.computed.backgroundClip.doesIncludeBorders) || this.styleManager.computed.borderColor))
          data += style.clear;

        return data;
      }

      if (y === this.elementRect.h - 1 && this.styleManager.computed.borderBottomCharacter) {
        let contentL = l;

        if (x === 0 && this.styleManager.computed.borderLeftCharacter) {
          prepend = this.styleManager.computed.borderBottomLeftCharacter ?? this.styleManager.computed.borderLeftCharacter;
          contentL -= 1;
        }

        if (x + l === this.elementRect.w && this.styleManager.computed.borderRightCharacter) {
          append = this.styleManager.computed.borderBottomRightCharacter ?? this.styleManager.computed.borderRightCharacter;
          contentL -= 1;
        }

        let data = prepend + this.styleManager.computed.borderBottomCharacter.repeat(contentL) + append;

        if (!this.rootNode.debugPaintRects && this.styleManager.computed.backgroundColor && this.styleManager.computed.backgroundClip.doesIncludeBorders)
          data = this.styleManager.computed.backgroundColor.back + data;

        if (!this.rootNode.debugPaintRects && this.styleManager.computed.borderColor)
          data = this.styleManager.computed.borderColor.front + data;

        if (!this.rootNode.debugPaintRects && ((this.styleManager.computed.backgroundColor && this.styleManager.computed.backgroundClip.doesIncludeBorders) || this.styleManager.computed.borderColor))
          data += style.clear;

        return data;
      }

      let contentX = x;
      const contentY = y;
      let contentL = l;

      if (this.styleManager.computed.borderLeftCharacter) {
        if (x === 0) {
          prepend = this.styleManager.computed.borderLeftCharacter;
          contentX += 1;
          contentL -= 1;
        } else {
          contentX -= 1;
        }
      }

      if (this.styleManager.computed.borderRightCharacter) {
        if (x + l === this.elementRect.w) {
          append = this.styleManager.computed.borderRightCharacter;
          contentL -= 1;
        }
      }

      if (this.styleManager.computed.backgroundColor && this.styleManager.computed.backgroundClip.doesIncludeBorders) {
        if (prepend)
          prepend = this.styleManager.computed.backgroundColor.back + prepend;

        if (append) {
          append = this.styleManager.computed.backgroundColor.back + append;
        }
      }

      if (this.styleManager.computed.borderColor) {
        if (prepend)
          prepend = this.styleManager.computed.borderColor.front + prepend;

        if (append) {
          append = this.styleManager.computed.borderColor.front + append;
        }
      }

      if ((this.styleManager.computed.backgroundColor && this.styleManager.computed.backgroundClip.doesIncludeBorders) || this.styleManager.computed.borderColor) {
        if (prepend)
          prepend += style.clear;

        if (append) {
          append += style.clear;
        }
      }

      return prepend + processContent(contentX + this.scrollRect.x, contentY + this.scrollRect.y, contentL) + append;
    };

    const processContent = (x: number, y: number, l: number) => {
      if (y < this.contentRect.y || y >= this.contentRect.y + this.contentRect.h)
        return this.renderBackground(l);
      else
        y -= this.contentRect.y;

      let prepend = ``;
      let append = ``;

      if (x < this.contentRect.x) {
        const size = Math.min(l, this.contentRect.x - x);
        prepend = this.renderBackground(size);
        x = 0, l -= size;
      } else {
        x -= this.contentRect.x;
      }

      if (x + l > this.contentRect.w) {
        const size = Math.min(l, x + l - this.contentRect.w);
        append = this.renderBackground(size);
        l -= size;
      }

      const content = this.renderContent(x, y, l);
      return prepend + content + append;
    };

    return processBorders(x, y, l);
  }

  renderContent(x: number, y: number, l: number) {
    return this.renderBackground(l);
  }

  renderBackground(l: number) {
    if (l < 0)
      throw new Error(`Failed to execute 'renderBackground': Invalid length (${l}).`);
    if (l === 0)
      return ``;

    const character = this.styleManager.computed.backgroundCharacter;
    if (this.rootNode.debugPaintRects)
      return character.repeat(l);

    let background = ``;
    if (this.styleManager.computed.backgroundColor)
      background += this.styleManager.computed.backgroundColor.back;
    if (this.styleManager.computed.color && character !== ` `)
      background += this.styleManager.computed.color.front;

    const hasStyles = background.length > 0;
    background += character.repeat(l);

    if (hasStyles)
      background += style.clear;

    return background;
  }

  renderText(text: string) {
    if (this.rootNode.debugPaintRects || text === ``)
      return text;

    let prefix = ``;
    let suffix = ``;

    if (this.styleManager.computed.fontWeight === StyleValues.Weight.Light)
      prefix += style.fainted.in;
    else if (this.styleManager.computed.fontWeight === StyleValues.Weight.Bold)
      prefix += style.emboldened.in;

    if (this.styleManager.computed.textDecoration === StyleValues.TextDecoration.Underline)
      prefix += style.underlined.in;

    if (this.styleManager.computed.backgroundColor)
      prefix += this.styleManager.computed.backgroundColor.back;
    if (this.styleManager.computed.color)
      prefix += this.styleManager.computed.color.front;

    if (prefix.length !== 0)
      suffix += style.clear;

    return prefix + text + suffix;
  }

  addShortcutListener(descriptors: string, callback: (e: EventOf<TermElement[`onKeyPress`]>) => void, {capture = false} = {}) {
    if (!capture)
      throw new Error(`Failed to execute 'addShortcutListener': The 'capture' option needs to be set when adding a shortcut.`);

    for (const descriptor of descriptors.split(/,/g)) {
      const sequence = new KeySequence(descriptor);

      this.onKeyPress.addEventListener(e => {
        if (sequence.add(e.attributes.key)) {
          callback(e);
        }
      }, {capture});
    }
  }


  get scrollLeft() {
    this.triggerUpdates();

    return this.scrollRect.x;
  }

  set scrollLeft(scrollLeft) {
    this.triggerUpdates();

    const previousScrollLeft = this.scrollRect.x;
    const newScrollLeft = Math.max(0, Math.min(scrollLeft, this.scrollRect.w - this.elementRect.w));

    if (previousScrollLeft !== newScrollLeft) {
      this.scrollRect.x = newScrollLeft;

      this.setDirtyClippingFlag();
      this.queueDirtyRect();

      this.onScroll.dispatchEvent({});
    }
  }

  get scrollTop() {
    this.triggerUpdates();

    return this.scrollRect.y;
  }

  set scrollTop(scrollTop) {
    this.triggerUpdates();

    const previousScrollTop = this.scrollRect.y;
    const newScrollTop = Math.max(0, Math.min(scrollTop, this.scrollRect.h - this.elementRect.h));

    if (previousScrollTop !== newScrollTop) {
      this.scrollRect.y = newScrollTop;

      this.setDirtyClippingFlag();
      this.queueDirtyRect();

      this.onScroll.dispatchEvent({});
    }
  }

  get scrollWidth() {
    this.triggerUpdates();

    return this.scrollRect.w;
  }

  get scrollHeight() {
    this.triggerUpdates();

    return this.scrollRect.h;
  }

  get offsetWidth() {
    this.triggerUpdates();

    return this.elementRect.w;
  }

  get offsetHeight() {
    this.triggerUpdates();

    return this.elementRect.h;
  }

  get innerWidth() {
    this.triggerUpdates();

    return this.contentRect.w;
  }

  get innerHeight() {
    this.triggerUpdates();

    return this.contentRect.h;
  }

  getCaretCoordinates(): Point | null {
    if (this.rootNode !== this)
      return this.rootNode.getCaretCoordinates();

    if (!this.activeElement || !this.activeElement.contentClipRect || !this.activeElement.caret)
      return null;

    const x = this.activeElement.contentWorldRect.x - this.activeElement.scrollRect.x + this.activeElement.caret.x;
    const y = this.activeElement.contentWorldRect.y - this.activeElement.scrollRect.y + this.activeElement.caret.y;

    if (x < this.activeElement.contentClipRect.x || x >= this.activeElement.contentClipRect.x + this.activeElement.contentClipRect.w)
      return null;

    if (y < this.activeElement.contentClipRect.y || y >= this.activeElement.contentClipRect.y + this.activeElement.contentClipRect.h)
      return null;

    return {x, y};
  }

  getBoundingClientRect() {
    this.triggerUpdates();

    return this.elementWorldRect;
  }

  focus() {
    if (this.rootNode.activeElement === this)
      return;

    if (!this.styleManager.computed.focusEvents)
      return;

    const previousActiveNode = this.rootNode.activeElement;

    if (this.rootNode.activeElement)
      this.rootNode.activeElement.blur();

    this.rootNode.activeElement = this;
    this.styleManager.setStateStatus(`focus`, true);

    this.scrollIntoView();

    this.onFocus.dispatchEvent({was: previousActiveNode});

    this.rootNode.requestUpdates();
  }

  blur({parentNode = this.parentNode} = {}) {
    if (!parentNode)
      return;
    if (parentNode.rootNode.activeElement !== this)
      return;

    parentNode.rootNode.activeElement = null;
    this.styleManager.setStateStatus(`focus`, false);

    this.onBlur.dispatchEvent({});

    parentNode.rootNode.requestUpdates();
  }

  focusRelativeElement(offset: number) {
    if (this.rootNode !== this) {
      this.focusRelativeElement(offset);
      return;
    }

    if (!(offset < 0 || offset > 0))
      return;

    this.triggerUpdates();

    if (!this.focusList.length)
      return;

    const getNextIndex = offset > 0 ? (currentIndex: number) => {
      return currentIndex === this.focusList.length - 1 ? 0 : currentIndex + 1;
    } : (currentIndex: number) => {
      return currentIndex === 0 ? this.focusList.length - 1 : currentIndex - 1;
    };

    if (!this.activeElement) {
      if (offset > 0) {
        this.focusList[0].focus();
      } else {
        this.focusList[this.focusList.length - 1].focus();
      }
    } else {
      let activeIndex = this.focusList.indexOf(this.activeElement);

      for (let t = 0, T = Math.abs(offset); t < T; ++t) {
        let nextIndex = getNextIndex(activeIndex);

        while (nextIndex !== activeIndex && (!this.focusList[nextIndex].styleManager.computed.focusEvents || !this.activeElement.validateRelativeFocusTarget(this.focusList[nextIndex]) || !this.focusList[nextIndex].validateRelativeFocusTargetSelf(this.activeElement)))
          nextIndex = getNextIndex(nextIndex);

        if (nextIndex !== activeIndex) {
          activeIndex = nextIndex;
        } else {
          break;
        }
      }

      this.focusList[activeIndex].focus();
    }
  }

  validateRelativeFocusTargetSelf(source: TermElement) {
    return true;
  }

  validateRelativeFocusTarget(target: TermElement) {
    return true;
  }

  focusPreviousElement() {
    this.focusRelativeElement(-1);
  }

  focusNextElement() {
    this.focusRelativeElement(+1);
  }

  scrollIntoView({align = `auto`, alignX = align, alignY = align, force = false, forceX = force, forceY = force}: ScrollIntoViewOptions = {}) {
    this.triggerUpdates();

    if (!this.parentNode)
      return;

    if (this.caret) {
      const x = this.elementRect.x + this.contentRect.x + this.caret.x;
      const y = this.elementRect.y + this.contentRect.y + this.caret.y;

      this.parentNode.scrollCellIntoView({x, y}, {alignX, alignY, forceX, forceY});
    } else {
      let effectiveAlignX = alignX;
      let effectiveAlignY = alignY;

      if (effectiveAlignX === `auto`)
        effectiveAlignX = Math.abs(this.elementRect.x - this.parentNode.scrollLeft) < Math.abs((this.elementRect.x + this.elementRect.w - 1) - (this.parentNode.scrollLeft + this.parentNode.elementRect.w - 1)) ? `start` : `end`;

      if (effectiveAlignY === `auto`)
        effectiveAlignY = Math.abs(this.elementRect.y - this.parentNode.scrollTop) < Math.abs((this.elementRect.y + this.elementRect.h - 1) - (this.parentNode.scrollTop + this.parentNode.elementRect.h - 1)) ? `start` : `end`;

      let x = this.elementRect.x;
      let y = this.elementRect.y;

      if (effectiveAlignX === `end`)
        x += this.elementRect.w - 1;

      if (effectiveAlignY === `end`)
        y += this.elementRect.h - 1;

      this.parentNode.scrollCellIntoView({x, y}, {alignX, alignY, forceX, forceY});
    }
  }

  scrollCellIntoView(position: Point, {align = `auto`, alignX = align, alignY = align, force = false, forceX = force, forceY = force}: ScrollIntoViewOptions = {}) {
    this.triggerUpdates();

    if (this.styleManager.computed.overflow.doesHideOverflow) {
      let effectiveAlignX = alignX;
      let effectiveAlignY = alignY;

      if (effectiveAlignX === `auto`)
        effectiveAlignX = Math.abs(position.x - this.scrollLeft) < Math.abs(position.x - (this.scrollLeft + this.elementRect.w - 1)) ? `start` : `end`;

      if (effectiveAlignY === `auto`)
        effectiveAlignY = Math.abs(position.y - this.scrollTop) < Math.abs(position.y - (this.scrollTop + this.elementRect.h - 1)) ? `start` : `end`;

      if (forceX || position.x < this.scrollLeft || position.x >= this.scrollLeft + this.elementRect.w) {
        switch (effectiveAlignX) {
          case `start`: {
            this.scrollLeft = position.x;
          } break;

          case `end`: {
            this.scrollLeft = position.x - this.elementRect.w + 1;
          } break;
        }
      }

      if (forceY || position.y < this.scrollTop || position.y >= this.scrollTop + this.elementRect.h) {
        switch (effectiveAlignY) {
          case `start`: {
            this.scrollTop = position.y;
          } break;

          case `end`: {
            this.scrollTop = position.y - this.elementRect.h + 1;
          } break;
        }
      }
    }

    if (this.parentNode) {
      const x = this.elementRect.x + position.x - this.scrollRect.x;
      const y = this.elementRect.y + position.y - this.scrollRect.y;

      this.parentNode.scrollCellIntoView({x, y}, {alignX, alignY});
    }
  }

  scrollColumnIntoView(column: number, {align = `auto`, force = false}: Pick<ScrollIntoViewOptions, `align` | `force`> = {}) {
    this.scrollCellIntoView({x: column, y: this.scrollTop}, {alignX: align, forceX: force});
  }

  scrollRowIntoView(row: number, {align = `auto`, force = false}: Pick<ScrollIntoViewOptions, `align` | `force`> = {}) {
    this.scrollCellIntoView({x: this.scrollLeft, y: row}, {alignY: align, forceY: force});
  }
}
