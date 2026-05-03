// Decides whether a nav link should render as the current page. The previous
// `pathname.startsWith(href)` check was too permissive: a link to
// `/category/books` would also light up while viewing `/category/books-2`.
// We require either an exact match or a `/`-bounded prefix so sibling slugs
// that share a prefix don't collide.
export function isActiveNavLink(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}
