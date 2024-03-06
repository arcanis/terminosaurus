export function parseSelector(selector: string | null) {
  if (selector === null)
    return new Set();

  if (!selector.match(/^(:[a-z]+([A-Z][a-z]+)*)+$/))
    throw new Error(`Failed to execute 'parseSelector': '${selector}' is not a valid selector.`);

  return new Set(selector.match(/[a-zA-Z]+/g));
}
