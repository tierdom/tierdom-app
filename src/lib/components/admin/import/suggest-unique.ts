// Picks a non-clashing slug + name pair for the "create new category" path
// of the import review form. If `slug` is already taken, appends `-2` (then
// `-3`, …) until a free slot is found, with the same numeric suffix mirrored
// onto the display name. Without this the create-new defaults clash with an
// existing category and the commit fails — the user then has to back out and
// edit the form manually.
export function suggestUnique(
  slug: string,
  name: string,
  taken: Set<string>,
): { slug: string; name: string } {
  if (!taken.has(slug)) return { slug, name };
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return { slug: `${slug}-${n}`, name: `${name} ${n}` };
}
