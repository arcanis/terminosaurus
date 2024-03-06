import {YogaNode}         from 'yogini';

import type {TermElement} from '#sources/dom/TermElement';

export function dirtyLayout(node: TermElement) {
  node.setDirtyLayoutFlag();
}

export function dirtyClipping(node: TermElement) {
  node.setDirtyClippingFlag();
}

export function dirtyRendering(node: TermElement) {
  node.queueDirtyRect();
}

export function dirtyFocusList(node: TermElement) {
  node.rootNode.setDirtyFocusListFlag();
}

export function dirtyRenderList(node: TermElement) {
  node.rootNode.setDirtyRenderListFlag();
}

export function onNullSwitch<T>(trigger: (node: TermElement, newValue: T, oldValue: T) => void) {
  return (node: TermElement, newValue: T, oldValue: T) => {
    if ((newValue === null) === (oldValue === null))
      return;

    trigger(node, newValue, oldValue);
  };
}

export function forwardToYoga(fnName: keyof YogaNode, ...args: Array<((value: any) => any) | any>) {
  return (node: TermElement, newValue: any) => {
    const mappedArgs = args.map(arg => {
      return typeof arg === `function` ? arg(newValue) : arg;
    });

    (node.yoga as any)[fnName](...mappedArgs);
  };
}

forwardToYoga.value = (value: {yoga: any}) => {
  return value != null ? value.yoga : value;
};

export function forwardToTextLayout(optName: string, cb: (value: any) => any) {
  return function (node: TermElement, newValue: any) {
    if (!node.textLayout)
      return;

    node.textLayout.setConfiguration({[optName]: cb(newValue)});
  };
}
