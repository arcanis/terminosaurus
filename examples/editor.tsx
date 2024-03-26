import {useState} from 'react';

import grammar    from '#data/languages/TypeScript.tmLanguage.json';
import theme      from '#data/themes/WinterIsComing.json';

import {
  EventOf,
  TermElement,
  TermText,
  createCanvasElement,
  useScreenColor,
} from 'terminosaurus/react';

const content = `
export function verse(n: number): string {
  switch (n) {
    case 0:
      return \`
        No more bottles of beer on the wall, no more bottles of beer.
        Go to the store and buy some more, 99 bottles of beer on the wall.
      \`;
    case 1:
      return \`
        1 bottle of beer on the wall, 1 bottle of beer.
        Take it down and pass it around, no more bottles of beer on the wall.
      \`;
    case 2:
      return \`
        2 bottles of beer on the wall, 2 bottles of beer.
        Take one down and pass it around, 1 bottle of beer on the wall.
      \`;
    default:
      return \`
        \${n} bottles of beer on the wall, \${n} bottles of beer.
        Take one down and pass it around, \${n - 1} bottles of beer on the wall.
      \`;
  }
}

export function sing(start: number = 99, end: number = 0): string {
  const res = [];

  for (let t = start; t >= end; ++t)
    res.push(verse(i));

  return res.join(\`\\n\`);
}
`.trimStart();

const useLineNumber = createCanvasElement<{
  scrollTop: number;
  rowCount: number;
}>({
  computeRefreshRect(newProps, oldProps) {
    if (newProps.scrollTop !== oldProps.scrollTop)
      return newProps.contentRect;

    const y = Math.min(newProps.rowCount, oldProps.rowCount);
    const h = Math.abs(newProps.rowCount - oldProps.rowCount);

    return {x: 0, y, w: newProps.contentRect.w, h};
  },
  renderLine(el, x, y, l, {scrollTop, rowCount}) {
    const res = y < rowCount
      ? `${scrollTop + y + 1}.`.slice(x)
      : ``;

    return el.renderText(res) + el.renderBackground(l - res.length);
  },
});

export function App() {
  const [source, setSource] = useState(content);

  const [LineNumber, setLineNumberProps] = useLineNumber({
    scrollTop: 0,
    rowCount: 0,
  });

  const onChange = (e: EventOf<TermText[`onChange`]>) => {
    setLineNumberProps({rowCount: e.target.textLayout.getRowCount()});
    setSource(e.target.text);
  };

  const onScroll = (e: EventOf<TermElement[`onScroll`]>) => {
    setLineNumberProps({scrollTop: e.target.scrollTop});
  };

  useScreenColor(theme.colors[`editor.background`]);

  return (
    <term:div flexDirection={`row`} width={`100%`} height={`100%`}>
      <LineNumber flexGrow={0} flexShrink={0} width={6} height={`100%`} color={theme.colors[`editorLineNumber.foreground`]}/>
      <term:div flexGrow={1}>
        <term:editor grammars={[grammar]} scopeName={`source.ts`} theme={theme} width={`100%`} height={`100%`} onChange={onChange} onScroll={onScroll} text={source}/>
      </term:div>
    </term:div>
  );
}
