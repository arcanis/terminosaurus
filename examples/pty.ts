import {LoremIpsum}                        from 'lorem-ipsum';

import {TermPty}                           from '#sources/elements/TermPty';
import {stableRandom}                      from '#sources/misc/Rand';
import {StyleValues, TermScreen, length} from 'terminosaurus';

export function run(screen: TermScreen) {
  const text = new TermPty();
  text.appendTo(screen.rootNode);

  text.style.reset({
    width: length(80),
    height: length(10),
    border: StyleValues.Border.Modern,
  });

  text.spawn(`bash`);
}
