export function getSpecificity(states: Set<string>) {
  let specificity = states.size;

  if (states.has(`decored`))
    specificity -= 1;

  return specificity;
}
