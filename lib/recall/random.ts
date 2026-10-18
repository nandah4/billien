/** Fisher–Yates. Accepts an `rng` so ordering is deterministic in tests. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
