import {Ruleset}      from './Ruleset';
import {StyleManager} from './StyleManager';

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
