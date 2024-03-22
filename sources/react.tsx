import React, {createContext, useCallback, useContext, useEffect, useRef} from 'react';

import {TermElement}                                                      from '#sources/dom/TermElement';
import {RunOptions, TermScreen}                                           from '#sources/dom/TermScreen';
import {run}                                                              from '#sources/index';
import {Rect}                                                             from '#sources/misc/Rect';
import {ReactElement}                                                     from '#sources/react/Tree';

export *                                                                  from '#sources/index';

const ScreenContext = createContext<TermScreen | null>(null);

export function useScreen() {
  return useContext(ScreenContext)!;
}

export function useScreenColor(color: string) {
  const screen = useScreen();

  useEffect(() => {
    screen.setClearColor(color);
    return () => {
      screen.setClearColor(null);
    };
  }, [color]);
}

export type CanvasElementSpec<T extends object> = {
  computeRefreshRect?: (newProps: T & {contentRect: Rect}, oldProps: T) => Rect;
  renderLine: (el: TermElement, x: number, y: number, l: number, props: T & {contentRect: Rect}) => string | null;
};

export function createCanvasElement<T extends object = {}>(spec: CanvasElementSpec<T>) {
  return (initialProps: T) => {
    const elRef = useRef<TermElement | null>(null);
    const propRef = useRef<T>(initialProps);

    const setElRef = (el: TermElement | null) => {
      elRef.current = el;

      if (el) {
        el.renderContent = function (x, y, l) {
          const contentRect: Rect = {x: 0, y: 0, w: this.contentRect.w, h: this.contentRect.h};
          const props = {...propRef.current, contentRect};

          return spec.renderLine(el, x, y, l, props) ?? el.renderBackground(l);
        };
      }
    };

    const Component = useCallback((props: React.ComponentProps<`term:div`>) => {
      return React.createElement(`term:div`, {ref: setElRef, ...props});
    }, []);

    const setProps = useCallback((props: Partial<T> = {}) => {
      const oldProps = propRef.current;
      propRef.current = {...oldProps, ...props};

      const el = elRef.current;
      if (el === null)
        return;

      if (typeof spec.computeRefreshRect !== `undefined`) {
        const contentRect: Rect = {x: 0, y: 0, w: el.contentRect.w, h: el.contentRect.h};
        const newProps = {...propRef.current, contentRect};

        const dirtyRect = {...spec.computeRefreshRect(newProps, oldProps)};
        dirtyRect.x += el.contentRect.x;
        dirtyRect.y += el.contentRect.y;

        el.queueDirtyRect(dirtyRect);
      } else {
        el.queueDirtyRect();
      }
    }, []);

    return [Component, setProps] as const;
  };
}

const wrap = (element: React.ReactNode, {screen}: {screen: TermScreen}) => (
  <ScreenContext.Provider value={screen}>
    {element}
  </ScreenContext.Provider>
);

/**
 * Render a React element into the terminal. Return a promise that resolves when the screen is closed.
 */
export async function render(element: React.ReactNode): Promise<void>;
export async function render(opts: RunOptions, element: React.ReactNode): Promise<void>;
export async function render(arg1: RunOptions | React.ReactNode, arg2?: React.ReactNode) {
  const opts = typeof arg2 !== `undefined` ? arg1 as RunOptions : {};
  const element = typeof arg2 !== `undefined` ? arg2 : arg1 as React.ReactNode;

  const {Reconciler} = await require(`#sources/react/Reconciler`) as typeof import('#sources/react/Reconciler');

  Reconciler.injectIntoDevTools({
    bundleType: 1,
    rendererPackageName: `@esfuse/term`,
    version: `1.0.0`,
  });

  let container: ReturnType<typeof Reconciler[`createContainer`]> | undefined;

  await run(opts, screen => {
    const onRecoverableError = () => {};

    container = Reconciler.createContainer(new ReactElement(screen.rootNode), 0, null, false, null, `term-`, onRecoverableError, null);
    Reconciler.updateContainer(wrap(element, {screen}), container, null, null);
  });

  if (typeof container !== `undefined`) {
    Reconciler.updateContainer(null, container, null, null);
  }
}
