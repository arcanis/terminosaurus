import {initMonoLayout}         from '#sources/deps/mono';
import {initYoga}               from '#sources/deps/yoga';
import {RunOptions, TermScreen} from '#sources/dom/TermScreen';

export async function init() {
  await Promise.all([initMonoLayout(), initYoga()]);
}

export async function run(opts: RunOptions, cb: (screen: TermScreen) => void | undefined) {
  await init();
  const screen = new TermScreen();
  return await screen.run(opts, () => {
    cb(screen);
  });
}

export {TermElement} from '#sources/dom/TermElement';
export {TermScreen, ScreenIn, ScreenOut, ScreenStreams} from '#sources/dom/TermScreen';

export {Ruleset} from '#sources/style/Ruleset';
export {StyleValues} from '#sources/style/StyleValues';
export * from '#sources/style/styleParsers';

export {TermButton} from '#sources/elements/TermButton';
export {TermInput} from '#sources/elements/TermInput';
export {TermText} from '#sources/elements/TermText';

export {makeRuleset} from '#sources/style/tools/makeRuleset';
export {parsePropertyValue} from '#sources/style/tools/parsePropertyValue';

export {EventSlot, Event, EventOf} from '#sources/misc/EventSource';
export {PassThrough} from '#sources/misc/PassThrough';
