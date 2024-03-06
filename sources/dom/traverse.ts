import {TermElement} from '#sources/dom/TermElement';

export function findAncestorByPredicate<T extends TermElement>(node: TermElement, predicate: (element: TermElement) => element is T): T;
export function findAncestorByPredicate(node: TermElement, predicate: (element: TermElement) => boolean): TermElement | null;
export function findAncestorByPredicate(node: TermElement, predicate: (element: TermElement) => boolean) {
  for (let current = node.parentNode; current; current = current.parentNode)
    if (predicate(current))
      return current;

  return null;
}

export function findAncestorsByPredicate(node: TermElement, predicate: (element: TermElement) => boolean) {
  const match = [];

  for (let current = node.parentNode; current; current = current.parentNode)
    if (predicate(current))
      match.push(current);

  return match;
}

export function findDescendantByPredicate(node: TermElement, predicate: (element: TermElement) => boolean) {
  const children = [...node.childNodes];

  while (children.length > 0) {
    const child = children.shift()!;
    if (predicate(child))
      return child;

    children.unshift(...child.childNodes);
  }

  return null;
}

export function findDescendantsByPredicate(node: TermElement, predicate: (element: TermElement) => boolean) {
  const children = node.childNodes.slice();
  const matches: Array<TermElement> = [];

  while (children.length > 0) {
    const child = children.shift()!;

    if (predicate(child))
      matches.push(child);

    children.unshift(...child.childNodes);
  }

  return matches;
}

export function isChildOf(node: TermElement, parent: TermElement) {
  for (let current = node.parentNode; current; current = current.parentNode)
    if (current === parent)
      return true;

  return false;
}
