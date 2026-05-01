export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

const DEFAULT_CUTOFFS: Record<Tier, number> = {
  S: 90,
  A: 80,
  B: 70,
  C: 55,
  D: 40,
  E: 20,
  F: 0,
};

export function scoreToTier(score: number, cutoffs?: Partial<Record<Tier, number | null>>): Tier {
  const resolved: Record<Tier, number> = {
    S: cutoffs?.S ?? DEFAULT_CUTOFFS.S,
    A: cutoffs?.A ?? DEFAULT_CUTOFFS.A,
    B: cutoffs?.B ?? DEFAULT_CUTOFFS.B,
    C: cutoffs?.C ?? DEFAULT_CUTOFFS.C,
    D: cutoffs?.D ?? DEFAULT_CUTOFFS.D,
    E: cutoffs?.E ?? DEFAULT_CUTOFFS.E,
    F: cutoffs?.F ?? DEFAULT_CUTOFFS.F,
  };
  for (const tier of TIERS) {
    if (score >= resolved[tier]) return tier;
  }
  return 'F';
}

export function scoreToBarColor(score: number): string {
  return `hsl(${(score / 100) * 120}, 70%, 45%)`;
}

export const tierColors: Record<Tier, { bg: string; fg: string }> = {
  S: { bg: 'var(--tier-s-bg)', fg: 'var(--tier-s-fg)' },
  A: { bg: 'var(--tier-a-bg)', fg: 'var(--tier-a-fg)' },
  B: { bg: 'var(--tier-b-bg)', fg: 'var(--tier-b-fg)' },
  C: { bg: 'var(--tier-c-bg)', fg: 'var(--tier-c-fg)' },
  D: { bg: 'var(--tier-d-bg)', fg: 'var(--tier-d-fg)' },
  E: { bg: 'var(--tier-e-bg)', fg: 'var(--tier-e-fg)' },
  F: { bg: 'var(--tier-f-bg)', fg: 'var(--tier-f-fg)' },
};
