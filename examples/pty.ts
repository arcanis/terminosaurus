import {StyleValues, TermScreen, length} from 'terminosaurus';

import {TermPty}                         from '../sources/elements/TermPty';

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
