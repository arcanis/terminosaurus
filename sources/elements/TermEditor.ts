import {TermInput}                        from '#sources/elements/TermInput';
import {addSyntaxHighlightSupport, Theme} from '#sources/extra/SyntaxHighlightLayout';

export class TermEditor extends TermInput {
  public enterIsNewline = true;

  public syntax = addSyntaxHighlightSupport(this.textLayout);

  constructor() {
    super();

    this.syntax.onRefresh.add(() => {
      this.queueDirtyRect();
    });
  }

  scopeName: string | null = null;

  resetScopeName() {
    this.setScopeName(null);
  }

  setScopeName(scopeName: string | null) {
    this.scopeName = scopeName;

    this.syntax.activate(scopeName);
  }

  get grammars() {
    return this.syntax.getGrammars();
  }

  resetGrammars() {
    this.syntax.setGrammars([]);
  }

  setGrammars(grammar: Array<{scopeName: string}>) {
    this.syntax.setGrammars(grammar);
  }

  get theme() {
    return this.syntax.getTheme();
  }

  resetTheme() {
    this.syntax.setTheme(null);
  }

  setTheme(theme: Theme) {
    this.syntax.setTheme(theme);
  }
}
