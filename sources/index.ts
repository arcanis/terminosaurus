import {initMonoLayout}         from '#sources/deps/mono';
import {initYoga}               from '#sources/deps/yoga';
import {RunOptions, TermScreen} from '#sources/dom/TermScreen';

export async function init() {
  await Promise.all([initMonoLayout(), initYoga()]);
}

/**
 * Create a new TermScreen and run the provided callback. Return a promise that resolves when the screen is closed.
 */
export async function run(cb: (screen: TermScreen) => void | undefined): Promise<number>;
export async function run(opts: RunOptions, cb: (screen: TermScreen) => void | undefined): Promise<number>;
export async function run(arg1: RunOptions | ((screen: TermScreen) => void | undefined), arg2?: (screen: TermScreen) => void | undefined) {
  const opts = typeof arg1 === `function` ? {} : arg1;
  const cb = typeof arg1 === `function` ? arg1 : arg2;

  await init();
  const screen = new TermScreen();
  return await screen.run(opts, () => {
    (cb as any)(screen);
  });
}

export {TermElement} from '#sources/dom/TermElement';
export {TermScreen, type ScreenIn, type ScreenOut, type ScreenStreams} from '#sources/dom/TermScreen';

export {Ruleset} from '#sources/style/Ruleset';
export {StyleValues} from '#sources/style/StyleValues';
export * from '#sources/style/styleParsers';

export {TermButton} from '#sources/elements/TermButton';
export {TermInput} from '#sources/elements/TermInput';
export {TermText} from '#sources/elements/TermText';

export {makeRuleset} from '#sources/style/tools/makeRuleset';
export {parsePropertyValue} from '#sources/style/tools/parsePropertyValue';

export {EventSlot, Event, type EventOf} from '#sources/misc/EventSource';
export {PassThrough} from '#sources/misc/PassThrough';
