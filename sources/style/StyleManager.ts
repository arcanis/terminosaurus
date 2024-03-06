import {TermElement}                                                                    from '#sources/dom/TermElement';
import {Ruleset, RulesetChangeEvent}                                                    from '#sources/style/Ruleset';
import {StyleValues}                                                                    from '#sources/style/StyleValues';
import {PropertyName, isPhysicalPropertyName, physicalProperties, PhysicalPropertyName} from '#sources/style/styleProperties';
import {getSpecificity}                                                                 from '#sources/style/tools/getSpecificity';
import {
  defaultComputedStyles,
  defaultInheritedStyles,
  defaultTriggeredStyles,
} from '#sources/style/styleProperties';

export class StyleManager {
  public states = new Set<string>();

  public userRulesets = new Set<Ruleset>();
  public localRuleset = new Ruleset();

  public stylePasses = [this.userRulesets, [this.localRuleset]];

  public default = defaultComputedStyles;
  public computed = {...this.default};

  public inherited = new Set<PropertyName>(defaultInheritedStyles);

  constructor(private element: TermElement) {
    this.localRuleset.addChangeListener(this.handleRulesetChange);
  }

  initialize() {
    for (const propertyName of defaultTriggeredStyles) {
      for (const trigger of physicalProperties[propertyName].triggers) {
        trigger(this.element, this.computed[propertyName], undefined);
      }
    }
  }

  getStateStatus(state: string) {
    return this.states.has(state);
  }

  setStateStatus(state: string, status: boolean) {
    if (status) {
      if (this.states.has(state))
        return;

      this.states.add(state);
    } else {
      if (!this.states.has(state))
        return;

      this.states.delete(state);
    }

    const dirtyProperties = new Set<PhysicalPropertyName>();

    for (const rulesets of this.stylePasses) {
      for (const ruleset of rulesets) {
        for (const {states, propertyValues} of ruleset.rules) {
          if (!states.has(state))
            continue;

          for (const propertyName of propertyValues.keys()) {
            dirtyProperties.add(propertyName);
          }
        }
      }
    }

    this.refresh(dirtyProperties);
  }

  setRulesets(rulesets: Array<Ruleset>) {
    const current = Array.from(this.userRulesets);
    const next = Array.from(rulesets);

    let skipCurrent = 0;
    let skipNext = 0;

    while (skipCurrent < current.length && skipNext < next.length) {
      if (!current[skipCurrent]) {
        skipCurrent += 1;
      } else if (current[skipCurrent] === next[skipNext]) {
        skipCurrent += 1;
        skipNext += 1;
      } else {
        break;
      }
    }

    const dirtyPropertyNames = new Set<PhysicalPropertyName>();

    for (let t = skipCurrent; t < current.length; ++t) {
      const ruleset = current[t];
      if (!ruleset)
        continue;

      this.userRulesets.delete(ruleset);

      const propertyNames = ruleset.keys();
      ruleset.removeChangeListener(this.handleRulesetChange);

      for (const propertyName of propertyNames) {
        dirtyPropertyNames.add(propertyName);
      }
    }

    for (let t = skipNext; t < next.length; ++t) {
      const ruleset = next[t];
      if (!ruleset)
        continue;

      this.userRulesets.add(ruleset);

      const propertyNames = ruleset.keys();
      ruleset.addChangeListener(this.handleRulesetChange);

      for (const propertyName of propertyNames) {
        dirtyPropertyNames.add(propertyName);
      }
    }

    this.refresh(dirtyPropertyNames);
  }

  addRuleset(ruleset: Ruleset) {
    if (this.userRulesets.has(ruleset))
      return;

    this.userRulesets.add(ruleset);

    const dirtyPropertyNames = ruleset.keys();
    ruleset.addChangeListener(this.handleRulesetChange);

    this.refresh(dirtyPropertyNames);
  }

  removeRuleset(ruleset: Ruleset) {
    if (!this.userRulesets.has(ruleset))
      return;

    this.userRulesets.add(ruleset);

    const dirtyPropertyNames = ruleset.keys();
    ruleset.removeChangeListener(this.handleRulesetChange);

    this.refresh(dirtyPropertyNames);
  }

  handleRulesetChange = (e: RulesetChangeEvent) => {
    for (const state of e.states)
      if (!this.states.has(state))
        return;

    this.refresh(e.properties);
  };

  get(propertyName: PhysicalPropertyName) {
    let value: any = physicalProperties[propertyName].initial;

    for (const rulesets of this.stylePasses) {
      let specificity = -Infinity;

      for (const ruleset of rulesets) {
        ruleLoop: for (const {states, propertyValues} of ruleset.rules) {
          const propertyValue = propertyValues.get(propertyName);

          // it doesn't have the property we're computing
          if (typeof propertyValue === `undefined`)
            continue ruleLoop;

          // it cannot match anyway
          if (states.size > this.states.size)
            continue ruleLoop;

          // it has a lower specificity than ours
          const ruleSpecificity = getSpecificity(states);
          if (ruleSpecificity < specificity)
            continue ruleLoop;

          for (const state of states)
            if (!this.states.has(state))
              continue ruleLoop;

          value = propertyValue;
          specificity = ruleSpecificity;
        }
      }
    }

    return value;
  }

  refresh(propertyNames: Set<PropertyName>, {inheritedOnly = false} = {}) {
    if (propertyNames.size === 0)
      return;

    const dirtyPropertyNames = new Set<PhysicalPropertyName>();

    for (const propertyName of propertyNames) {
      if (!isPhysicalPropertyName(propertyName))
        continue;

      if (inheritedOnly && !this.inherited.has(propertyName))
        continue;

      const oldValue = this.computed[propertyName];
      let newValue = this.get(propertyName);

      if (newValue === StyleValues.Inherit) {
        this.inherited.add(propertyName);

        if (this.element.parentNode) {
          newValue = this.element.parentNode.styleManager.computed[propertyName];
        } else {
          newValue = this.default[propertyName];
        }
      } else {
        this.inherited.delete(propertyName);
      }

      if (newValue !== oldValue) {
        dirtyPropertyNames.add(propertyName);

        // @ts-expect-error
        this.computed[propertyName] = newValue;

        for (const trigger of physicalProperties[propertyName].triggers) {
          trigger(this.element, newValue, oldValue);
        }
      }
    }

    if (dirtyPropertyNames.size > 0) {
      for (const child of this.element.childNodes) {
        child.styleManager.refresh(dirtyPropertyNames, {inheritedOnly: true});
      }
    }
  }
}
