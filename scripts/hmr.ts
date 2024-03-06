import fs           from 'fs';
import path         from 'path';
import ReactRefresh from 'react-refresh/runtime';

declare global {
  var $RefreshReg$: (type: unknown, id: string) => any;
  var $RefreshSig$: () => (type: any) => any;
}

ReactRefresh.injectIntoGlobalHook(globalThis as any);

globalThis.$RefreshReg$ = ReactRefresh.register;
globalThis.$RefreshSig$ = ReactRefresh.createSignatureFunctionForTransform;

const watchRoot = path.resolve(`.`);

const watcher = fs.watch(watchRoot, {recursive: true}, (eventType, relPath) => {
  const absPath = path.resolve(watchRoot, relPath);
  if (eventType !== `change` || !require.cache[absPath])
    return;

  $esfuse$.refresh(absPath).then(() => {
    ReactRefresh.performReactRefresh();
  });
});

// @ts-expect-error
watcher.unref();
