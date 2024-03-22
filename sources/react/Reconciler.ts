import createReconciler, {HostConfig} from 'react-reconciler';

import {ElementMap}                   from '#sources/react/ElementMap';
import {ReactElement, ReactText}      from '#sources/react/Tree';
import {isPropertyName, PropertyName} from '#sources/style/styleProperties';
import {parsePropertyValue}           from '#sources/style/tools/parsePropertyValue';

import {
  DefaultEventPriority,
} from 'react-reconciler/constants';

type Type = string;
type Props = Record<string, any>;
type Container = ReactElement;
type Instance = ReactElement;
type TextInstance = ReactText;
type SuspenseInstance = ReactElement;
type HydratableInstance = unknown;
type PublicInstance = unknown;
type HostContext = {hostSym: symbol};
type UpdatePayload = TriagedProps;
type ChildSet = unknown;
type TimeoutHandle = ReturnType<typeof setTimeout>;
type NoTimeout = null;

export type TermHostConfig = HostConfig<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout
>;

const contextSym = Symbol();
const eventRegExp = /^on[A-Z]/;

function wrapWithBatch(fn: (e: any) => void, hostContext: HostContext) {
  return (fn as any)[hostContext.hostSym] ??= (e: any) => {
    Reconciler.batchedUpdates(fn, e);
  };
}

type TriagedProps = {
  text: string | null;

  styles: Map<PropertyName, any>;
  params: Map<string, any>;

  addedEvents: Map<string, (e: any) => void>;
  removedEvents: Map<string, (e: any) => void>;
};

function triageProps(hostContext: HostContext, props: Record<string, any>, oldProps?: Record<string, any>) {
  const fn = () => {};
  if (wrapWithBatch(fn, hostContext) !== wrapWithBatch(fn, hostContext))
    throw new Error(`wrapWithBatch is not stable`);

  const triagedProps: TriagedProps = {
    text: null,

    styles: new Map(),
    params: new Map(),

    addedEvents: new Map(),
    removedEvents: new Map(),
  };

  if (oldProps)
    for (const [k, v] of Object.entries(oldProps))
      if (k.match(eventRegExp) && v && (!Object.hasOwn(props, k) || props[k] !== v))
        triagedProps.removedEvents.set(k, wrapWithBatch(v, hostContext));

  for (const [k, v] of Object.entries(props)) {
    if (oldProps && Object.hasOwn(oldProps, k) && oldProps[k] === v)
      continue;

    if (k === `children`) {
      triagedProps.text = typeof v === `string` ? v : null;
    } else if (isPropertyName(k)) {
      triagedProps.styles.set(k, parsePropertyValue(k, v));
    } else if (k.match(eventRegExp) && v) {
      triagedProps.addedEvents.set(k, wrapWithBatch(v, hostContext));
    } else {
      triagedProps.params.set(`${k[0].toUpperCase()}${k.slice(1)}`, v);
    }
  }

  return triagedProps;
}

function applyProps(element: any, props: TriagedProps) {
  element.style.set(props.styles);

  for (const [eventName, callback] of props.removedEvents)
    element[eventName].removeEventListener(callback);

  for (const [eventName, callback] of props.addedEvents)
    element[eventName].addEventListener(callback);

  for (const [parameterName, value] of props.params) {
    if (typeof value !== `undefined`) {
      element[`set${parameterName}`](value);
    } else {
      element[`reset${parameterName}`]();
    }
  }

  if (props.text !== null && element.setText) {
    element.setText(props.text);
  }
}

function withTracker<T extends object>(obj: T) {
  return obj;

  const makeWrapper = (key: string, fn: Function) => (...args: Array<any>) => {
    console.log(key);
    return fn(...args);
  };

  return Object.fromEntries(Object.entries(obj).map(([key, value]) => {
    const mapped = typeof value === `function`
      ? makeWrapper(key, value)
      : value;

    return [key, mapped];
  })) as T;
}

export const HostConfigImplementation: Partial<TermHostConfig> = {
  supportsMutation: true,
  supportsPersistence: false,

  createInstance(type, props, rootContainer, hostContext, internalHandle) {
    const ElementClass = ElementMap.get(type);

    if (typeof ElementClass === `undefined`)
      throw new Error(`Invalid element type "${type}"`);

    const element = new ElementClass();
    applyProps(element, triageProps(hostContext, props));

    return new ReactElement(element);
  },

  createTextInstance(text, rootContainer, hostContext, internalHandle) {
    return new ReactText(text);
  },

  appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },

  finalizeInitialChildren(instance, type, props, rootContainer, hostContext) {
    return false;
  },

  prepareUpdate(instance, type, oldProps, newProps, rootContainer, hostContext) {
    return triageProps(hostContext, newProps, oldProps);
  },

  shouldSetTextContent(type, props) {
    return false;
  },

  getRootHostContext(rootContainer) {
    return (rootContainer as any)[contextSym] ??= {hostSym: Symbol()};
  },

  getChildHostContext(parentHostContext, type, rootContainer) {
    return parentHostContext;
  },

  getPublicInstance(instance) {
    return instance.termNode;
  },

  prepareForCommit(containerInfo) {
    return {};
  },

  resetAfterCommit(containerInfo) {
  },

  preparePortalMount(containerInfo) {
  },

  scheduleTimeout(fn, delay) {
    return setTimeout(fn, delay);
  },

  cancelTimeout(id) {
    clearTimeout(id);
  },

  noTimeout: null,

  supportsMicrotasks: true,

  scheduleMicrotask(fn) {
    queueMicrotask(fn);
  },

  isPrimaryRenderer: true,

  getCurrentEventPriority() {
    return DefaultEventPriority;
  },

  appendChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },

  appendChildToContainer(container, child) {
    container.appendChild(child);
  },

  insertBefore(parentInstance, child, beforeChild) {
    parentInstance.insertBefore(child, beforeChild);
  },

  insertInContainerBefore(container, child, beforeChild) {
    container.insertBefore(child, beforeChild);
  },

  removeChild(parentInstance, child) {
    parentInstance.removeChild(child);
  },

  removeChildFromContainer(container, child) {
    container.removeChild(child);
  },

  resetTextContent(instance) {
    (instance.termNode as any).resetText();
  },

  commitTextUpdate(textInstance, prevText, nextText) {
    textInstance.setText(nextText);
  },

  commitMount(instance) {
  },

  commitUpdate(instance, updatedProps, type, oldProps, newProps, internalHandle) {
    applyProps(instance.termNode, updatedProps);
  },

  hideInstance(instance) {
  },

  hideTextInstance(textInstance) {
  },

  unhideInstance(instance, props) {
  },

  unhideTextInstance(textInstance, text) {
  },

  clearContainer(container) {
  },

  detachDeletedInstance(node) {
  },
};

export const Reconciler = createReconciler(withTracker(HostConfigImplementation as TermHostConfig));
