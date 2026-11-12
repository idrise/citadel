/** A reproducible URL is optional; ordinary attempts get independent random seeds. */
export function roundSeed(
  search = window.location.search,
  random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]!,
  parameter: "seed" | "supplySeed" = "seed",
) {
  const params = new URLSearchParams(search);
  const value = params.get(parameter) ?? (parameter === "supplySeed" ? params.get("seed") : null);
  if (value !== null && /^\d+$/.test(value) && Number(value) <= 0xffffffff) return Number(value);
  return random() >>> 0;
}
