import {AllPropertiesTypes, PhysicalPropertyName, PropertyName, castToPropertyMap, expandCompoundProperties} from '#sources/style/styleProperties';

export type RulesetChangeEvent = {
  states: Set<string>;
  properties: Set<PhysicalPropertyName>;
};

export class Ruleset {
  // A refcount map, to know which properties are impacted by the ruleset
  private propertyNames = new Map<PhysicalPropertyName, number>();

  // A set of callbacks to call when the ruleset changes
  private listeners = new Set<(e: RulesetChangeEvent) => void>();

  public rules: Array<{
    states: Set<string>;
    propertyValues: Map<PhysicalPropertyName, any>;
  }> = [];

  public reset = this.when(new Set()).reset;
  public set = this.when(new Set()).set;

  addChangeListener(cb: (e: RulesetChangeEvent) => void) {
    this.listeners.add(cb);
  }

  removeChangeListener(cb: (e: RulesetChangeEvent) => void) {
    this.listeners.delete(cb);
  }

  keys() {
    return new Set(this.propertyNames.keys());
  }

  when(states: Set<string>) {
    const findRule = () => this.rules.find(rule => {
      if (states.size !== rule.states.size)
        return false;

      for (const state of rule.states)
        if (!states.has(state))
          return false;

      return true;
    });

    const makeRule = () => {
      const rule: typeof this.rules[number] = {states, propertyValues: new Map()};
      this.rules.push(rule);

      return rule;
    };

    const rule = findRule()
      ?? makeRule();

    const reset = (propertyValues: Map<PhysicalPropertyName, any>) => {
      const resetValues = [...rule.propertyValues.keys()].map(k => [k, undefined] as const);

      return set(new Map([...resetValues, ...propertyValues]));
    };

    const set = (propertyValues: Map<PhysicalPropertyName, any>) => {
      const dirtyPropertyNames = new Set<PhysicalPropertyName>();

      for (const [propertyName, newValue] of propertyValues) {
        const oldValue = rule.propertyValues.get(propertyName);
        if (newValue === oldValue)
          continue;

        if (typeof newValue !== `undefined`)
          rule.propertyValues.set(propertyName, newValue);
        else
          rule.propertyValues.delete(propertyName);

        let count = this.propertyNames.get(propertyName) ?? 0;
        count += typeof newValue !== `undefined` ? 1 : -1;

        if (count > 0)
          this.propertyNames.set(propertyName, count);
        else
          this.propertyNames.delete(propertyName);

        dirtyPropertyNames.add(propertyName);
      }

      if (dirtyPropertyNames.size > 0) {
        const params = {
          states: rule.states,
          properties: dirtyPropertyNames,
        };

        for (const listener of this.listeners) {
          listener(params);
        }
      }

      return dirtyPropertyNames.size > 0;
    };

    return {
      values: rule.propertyValues,

      reset: (propertyValues: Map<PropertyName, any> | Partial<AllPropertiesTypes>) => {
        return reset(expandCompoundProperties(castToPropertyMap(propertyValues)));
      },

      set: (propertyValues: Map<PropertyName, any> | Partial<AllPropertiesTypes>) => {
        return set(expandCompoundProperties(castToPropertyMap(propertyValues)));
      },
    };
  }
}
