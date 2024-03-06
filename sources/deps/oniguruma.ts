import {loadWASM, OnigScanner, OnigString} from 'vscode-oniguruma';

import {loadOniguruma}                     from '#sources/deps/wasm';

let ready = false;

export async function initOniguruma() {
  if (!ready) {
    await loadWASM(await loadOniguruma());
    ready = true;
  }

  return {
    createOnigScanner,
    createOnigString,
  };
}

export function createOnigScanner(patterns: Array<string>) {
  return new OnigScanner(patterns);
}

export function createOnigString(s: string) {
  return new OnigString(s);
}
