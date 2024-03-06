import {LoremIpsum}                        from 'lorem-ipsum';

import {stableRandom}                      from '#sources/misc/Rand';
import {StyleValues, TermScreen, TermText} from 'terminosaurus';

const lorem = new LoremIpsum({
  random: stableRandom(`foo`),
  seed: `foo`,
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
});

export function run(screen: TermScreen) {
  const text = new TermText();
  text.appendTo(screen.rootNode);
  text.setText(lorem.generateParagraphs(7));

  text.style.reset({
    textAlign: StyleValues.TextAlign.Justify,
  });
}
