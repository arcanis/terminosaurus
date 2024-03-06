import {Ruleset}            from '#sources/style/Ruleset';
import {AllPropertiesTypes} from '#sources/style/styleProperties';

export function makeRuleset(opts: Record<string, Partial<AllPropertiesTypes>>) {
  const ruleset = new Ruleset();

  for (const [selector, properties] of Object.entries(opts)) {
    const states: Set<string> = selector !== `*`
      ? new Set(parseSelector(selector))
      : new Set();

    ruleset.when(states).reset(properties);
  }

  return ruleset;
}

function parseSelector(selector: string) {
  if (!selector.match(/^(:[a-z]+([A-Z][a-z]+)*)+$/))
    throw new Error(`Failed to execute 'parseSelector': '${selector}' is not a valid selector.`);

  return new Set([...selector.matchAll(/[a-zA-Z]+/g)].map(match => match[0]));
}
