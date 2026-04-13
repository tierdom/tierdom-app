import { gamingPlatforms } from './gaming-platforms';

export type IconSetIcon = { src: string; alt: string };

export type IconSet = {
  slug: string;
  name: string;
  icons: Record<string, IconSetIcon>;
};

export const iconSets: IconSet[] = [gamingPlatforms];

const iconSetMap = new Map(iconSets.map((s) => [s.slug, s]));

export function getIconSetBySlug(slug: string): IconSet | undefined {
  return iconSetMap.get(slug);
}

export function getIcon(setSlug: string, value: string): IconSetIcon | undefined {
  return iconSetMap.get(setSlug)?.icons[value];
}

export const knownIconSetSlugs = new Set(iconSets.map((s) => s.slug));
