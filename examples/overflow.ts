import {LoremIpsum}                        from 'lorem-ipsum';

import {stableRandom}                      from '#sources/misc/Rand';
import {StyleValues, TermElement, TermScreen, TermText, length} from 'terminosaurus';

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
  const container = new TermElement();
  container.appendTo(screen.rootNode);

  container.style.set({
    border: StyleValues.Border.Modern,
    height: length(10),
    overflow: StyleValues.Overflow.Hidden,
    whiteSpace: StyleValues.WhiteSpace.PreWrap,
  });

  const text = new TermText();
  text.appendTo(container);
  text.setText(lorem.generateParagraphs(7).replace(/\n/g, `\n\n`));

  screen.rootNode.triggerUpdates();

  console.log(container.getDebugInfo());
  console.log(text.getDebugInfo());
}
