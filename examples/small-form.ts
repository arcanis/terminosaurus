import {
  TermElement,
  TermScreen,
  TermInput,
  TermText,
  StyleValues,
  length,
  TermButton,
} from 'terminosaurus';

export function run(screen: TermScreen) {
  for (let t = 0; t < 10; ++t) {
    const container = new TermElement();
    container.style.set({marginTop: length(t > 0 ? 1 : 0)});
    container.appendTo(screen.rootNode);

    const n = t + 1;
    const th = n === 1 ? `st` : n === 2 ? `nd` : n === 3 ? `rd` : `th`;

    const label = new TermText();
    label.style.set({fontWeight: StyleValues.Weight.Bold, textDecoration: StyleValues.TextDecoration.Underline});
    label.setText(`The ${n}${th} form entry`);
    label.appendTo(container);

    const input = new TermInput();
    input.styleManager.setStateStatus(`decorated`, true);
    input.style.set({marginTop: StyleValues.Length.One});
    input.setMultiline(true);
    input.setText(`Hello world`);
    input.appendTo(container);
  }
}
