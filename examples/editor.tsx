import fs         from 'fs';
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

const content = fs.readFileSync(__filename, `utf8`);

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
