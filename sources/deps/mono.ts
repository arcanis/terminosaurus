import {Context, createContext} from 'mono-layout';

import {loadMono}               from '#sources/deps/wasm';

let mono: Context | undefined;

export async function initMonoLayout() {
  if (typeof mono === `undefined`)
    mono = await createContext(await loadMono());

  return mono;
}

export function createLayout() {
  return mono!.createLayout();
}
