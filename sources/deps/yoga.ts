import {createContext, YogaConfig} from 'yogini';

import {loadYogini}                from '#sources/deps/wasm';

let yoga: YogaConfig | undefined;

export async function initYoga() {
  if (typeof yoga === `undefined`) {
    yoga = await createContext(await loadYogini());
    yoga.setPointScaleFactor(0);
  }

  return yoga;
}

export function createNode() {
  return yoga!.createNode();
}
