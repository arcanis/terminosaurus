import theme                          from '#data/themes/WinterIsComing.json';
import {initMonoLayout, createLayout} from '#sources/deps/mono';
import {addSyntaxHighlightSupport}    from '#sources/extra/SyntaxHighlightLayout';

beforeAll(async () => {
  await initMonoLayout();
});

describe(`SyntaxHighlightLayout`, () => {
  describe(`getTokens`, () => {
    it(`supports tokenizing a single line`, async () => {
      const layout = createLayout();
      const syntax = addSyntaxHighlightSupport(layout);

      await syntax.activate(`source.ts`);
      syntax.setTheme(theme);

      layout.setSource(`const foo = 42;\n`);

      expect(syntax.getTokens()).toMatchSnapshot();
    });

    it(`supports expanding a line`, async () => {
      const layout = createLayout();
      const syntax = addSyntaxHighlightSupport(layout);

      await syntax.activate(`source.ts`);
      syntax.setTheme(theme);

      layout.setSource(`const foo = 42;\n`);
      layout.spliceSource(7, 1, `uu: number = 1;\nconst bo`);

      expect(syntax.getTokens()).toMatchSnapshot();
    });

    it(`supports shrinking a line`, async () => {
      const layout = createLayout();
      const syntax = addSyntaxHighlightSupport(layout);

      await syntax.activate(`source.ts`);
      syntax.setTheme(theme);

      layout.setSource(`const foo = 42;\nconst bar = 21;\n`);
      layout.spliceSource(7, 16, `woop`);

      expect(syntax.getTokens()).toMatchSnapshot();
    });
  });

  describe(`getLine`, () => {
    it.only(`supports highlighting a single line`, async () => {
      const layout = createLayout();
      const syntax = addSyntaxHighlightSupport(layout);

      await syntax.activate(`source.ts`);
      syntax.setTheme(theme);

      layout.setSource(`const foo = 42;\n`);

      expect(layout.getLine(0)).toMatchSnapshot();
    });
  });
});
