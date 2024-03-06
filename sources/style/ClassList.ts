import {Ruleset}      from '#sources/style/Ruleset';
import {StyleManager} from '#sources/style/StyleManager';

export class ClassList {
  constructor(private styleManager: StyleManager) {
  }

  assign(rulesets: Array<Ruleset>) {
    this.styleManager.setRulesets(rulesets);
  }

  add(ruleset: Ruleset) {
    this.styleManager.addRuleset(ruleset);
  }

  remove(ruleset: Ruleset) {
    this.styleManager.removeRuleset(ruleset);
  }
}
