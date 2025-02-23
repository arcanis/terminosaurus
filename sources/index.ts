import {initMonoLayout}         from './deps/mono';
import {initYoga}               from './deps/yoga';
import {RunOptions, TermScreen} from './dom/TermScreen';

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

export {TermElement} from './dom/TermElement';
export {TermScreen, type ScreenIn, type ScreenOut, type ScreenStreams} from './dom/TermScreen';

export {Ruleset} from './style/Ruleset';
export {StyleValues} from './style/StyleValues';
export * from './style/styleParsers';

export {TermButton} from './elements/TermButton';
export {TermInput} from './elements/TermInput';
export {TermText} from './elements/TermText';

export {makeRuleset} from './style/tools/makeRuleset';
export {parsePropertyValue} from './style/tools/parsePropertyValue';

export {EventSlot, Event, type EventOf} from './misc/EventSource';
export {PassThrough} from './misc/PassThrough';
