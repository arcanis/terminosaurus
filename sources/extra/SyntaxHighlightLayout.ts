import {TextLayout, TextOperation}                                                     from 'mono-layout';
import {style}                                                                         from 'term-strings';
import {IGrammar, INITIAL, IRawTheme, ITokenizeLineResult2, parseRawGrammar, Registry} from 'vscode-textmate';

import {initOniguruma}                                                                 from '#sources/deps/oniguruma';

export type Theme = {
  tokenColors: IRawTheme[`settings`];
};

export function addSyntaxHighlightSupport(textLayout: TextLayout) {
  const defaultTheme = {tokenColors: []};
  const onRefresh = new Set<() => void>();

  let grammarMap = new Map<string, {scopeName: string}>();

  const onigLib = initOniguruma();
  const makeRegistry = () => new Registry({
    onigLib,
    loadGrammar: async scopeName => {
      const grammar = grammarMap.get(scopeName);
      if (typeof grammar === `undefined`)
        return null;

      return parseRawGrammar(JSON.stringify(grammar), `grammar.json`);
    },
  });

  let activeRegistry: Registry = makeRegistry();
  let activeTheme: Theme = defaultTheme;
  let activeGrammar: IGrammar | null = null;

  let grammarPromise: Promise<void> | null = null;

  const currentTokenizedLines: Array<ITokenizeLineResult2> = [];
  regenerateAll();

  function regenerateAll() {
    regenerateRange({
      startingRow: 0,
      deletedLineCount: 0,
      addedLineCount: textLayout.getRowCount(),
    });

    for (const cb of onRefresh) {
      cb();
    }
  }

  function regenerateRange(op: TextOperation): TextOperation {
    if (!activeGrammar)
      return op;

    const tokenizedLines: Array<ITokenizeLineResult2> = [];

    let startingRow = op.startingRow;

    let deletedLineCount = op.deletedLineCount;
    let addedLineCount = op.addedLineCount;

    while (startingRow > 0 && textLayout.doesSoftWrap(startingRow - 1)) {
      startingRow -= 1;

      deletedLineCount += 1;
      addedLineCount += 1;
    }

    let prevState = startingRow > 0
      ? currentTokenizedLines[startingRow - 1].ruleStack
      : INITIAL;

    for (let t = startingRow, T = t + addedLineCount; t < T; ++t) {
      const tokenizedLine = activeGrammar.tokenizeLine2(realGetLine.call(textLayout, t), prevState);

      tokenizedLines.push(tokenizedLine);
      prevState = tokenizedLine.ruleStack;
    }

    const trailingIndex = startingRow + addedLineCount;
    const trailingLines = textLayout.getRowCount() - trailingIndex;

    for (let t = 0; t < trailingLines; ++t) {
      const tokenizedLine = activeGrammar!.tokenizeLine2(realGetLine.call(textLayout, trailingIndex + t), prevState);

      const previousTokenization = currentTokenizedLines[trailingIndex + t - addedLineCount + deletedLineCount];
      if (tokenizedLine.ruleStack.equals(previousTokenization.ruleStack))
        break;

      tokenizedLines.push(tokenizedLine);
      prevState = tokenizedLine.ruleStack;

      deletedLineCount += 1;
      addedLineCount += 1;
    }

    currentTokenizedLines.splice(startingRow, deletedLineCount, ...tokenizedLines);

    return {
      startingRow,
      deletedLineCount,
      addedLineCount,
    };
  }

  function getColor(metadata: number) {
    const colorMap = activeRegistry.getColorMap();
    const fgColor = colorMap[(metadata & 0b00000000111111111000000000000000) >>> 15];

    return style.color.front(fgColor);
  }

  function getTokenFragment(row: number, start: number, end: number, source: string, tokenIndex: number) {
    const tokens = currentTokenizedLines[row].tokens;

    const startIndex = tokens[tokenIndex];
    const endIndex = tokenIndex + 2 < tokens.length
      ? tokens[tokenIndex + 2]
      : end;

    const fixedStartIndex = Math.max(startIndex, start);
    const fixedEndIndex = Math.min(endIndex, end);

    const slice = source.slice(fixedStartIndex - start, fixedEndIndex - start);
    const metadata = tokens[tokenIndex + 1];

    return getColor(metadata) + slice;
  }

  const realSetSource = textLayout.setSource;
  textLayout.setSource = function (source) {
    return regenerateRange(realSetSource.call(this, source));
  };

  const realSpliceSource = textLayout.spliceSource;
  textLayout.spliceSource = function (start, deleted, added) {
    return regenerateRange(realSpliceSource.call(this, start, deleted, added));
  };

  const realGetLine = textLayout.getLine;
  textLayout.getLine = function (row) {
    const source = realGetLine.call(this, row);
    if (!activeGrammar)
      return source;

    const lineTokens = currentTokenizedLines[row].tokens;

    let result = ``;

    for (let t = 0; t < lineTokens.length; t += 2) {
      const startIndex = lineTokens[t];
      const endIndex = t + 2 < lineTokens.length
        ? lineTokens[t + 2]
        : source.length;

      const slice = source.slice(startIndex, endIndex);
      const metadata = lineTokens[t + 1];

      result += getColor(metadata) + slice;
    }

    return result + style.clear;
  };

  const realGetLineSlice = textLayout.getLineSlice;
  textLayout.getLineSlice = function (row, start, end) {
    const source = realGetLineSlice.call(this, row, start, end);
    if (!activeGrammar)
      return source;

    const lineTokens = currentTokenizedLines[row].tokens;

    let tokenIndex = 0;
    while (tokenIndex + 2 < lineTokens.length && lineTokens[tokenIndex + 2] <= start)
      tokenIndex += 2;

    let result = ``;
    while (tokenIndex < lineTokens.length && lineTokens[tokenIndex] < end) {
      result += getTokenFragment(row, start, end, source, tokenIndex);
      tokenIndex += 2;
    }

    return result + style.clear;
  };

  return {
    onRefresh,

    activate(scopeName: string | null) {
      const loadPromise = scopeName !== null
        ? activeRegistry!.loadGrammar(scopeName)
        : Promise.resolve(null);

      const promise = grammarPromise = loadPromise.then(grammar => {
        if (grammarPromise !== promise)
          return;

        activeGrammar = grammar;
        regenerateAll();
      });

      return promise;
    },

    getGrammars() {
      return [...grammarMap.values()];
    },

    setGrammars(grammars: Array<{scopeName: string}>) {
      const newGrammarMap = new Map();
      for (const grammar of grammars)
        newGrammarMap.set(grammar.scopeName, grammar);

      const currentGrammars = [...grammarMap.values()];
      if (currentGrammars.every(grammar => newGrammarMap.get(grammar.scopeName) === grammar)) {
        grammarMap = newGrammarMap;
        return;
      }

      activeRegistry = makeRegistry();

      regenerateAll();
    },

    getTheme() {
      return activeTheme;
    },

    setTheme(theme: Theme | null) {
      activeTheme = theme ?? defaultTheme;

      activeRegistry?.setTheme({settings: activeTheme.tokenColors});
      regenerateAll();
    },

    getTokens() {
      return currentTokenizedLines.map((tokenizedLine, n) => {
        const source = textLayout.getLine(n);
        const tokens: Array<[string, string, string]> = [];
        const colorMap = activeRegistry.getColorMap();

        for (let t = 0; t < tokenizedLine.tokens.length; t += 2) {
          const startIndex = tokenizedLine.tokens[t];
          const endIndex = t + 2 < tokenizedLine.tokens.length
            ? tokenizedLine.tokens[t + 2]
            : source.length;

          const metadata = tokenizedLine.tokens[t + 1];
          const fgColor = colorMap[(metadata & 0b00000000111111111000000000000000) >>> 15];
          const bgColor = colorMap[(metadata & 0b11111111000000000000000000000000) >>> 24];

          tokens.push([source.slice(startIndex, endIndex), fgColor, bgColor]);
        }

        return tokens;
      });
    },
  };
}
