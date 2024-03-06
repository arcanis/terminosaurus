export function stableRandom(seed: string) {
  function* randomGenerator() {
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
      let char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    while (true) {
      hash = Math.sin(hash++) * 10000;
      yield hash - Math.floor(hash);
    }
  }

  const generator = randomGenerator();
  return () => generator.next().value as number;
}
