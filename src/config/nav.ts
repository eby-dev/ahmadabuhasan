/**
 * Primary navigation items rendered in Navbar (desktop) and mobile drawer.
 * Order is significant: rendered top-to-bottom / left-to-right.
 * Blog is intentionally omitted; Navbar.astro inserts it dynamically
 * only when at least one non-draft blog entry exists.
 */

export interface NavItem {
  readonly label: string;
  readonly href: string;
}

export const PRIMARY_NAV = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Experience', href: '/experience' },
  { label: 'Projects', href: '/projects' },
  { label: 'Skills', href: '/skills' },
  { label: 'Contact', href: '/contact' },
] as const satisfies readonly NavItem[];

/**
 * Returns true if `pathname` is the current active route for `item.href`.
 * Home is treated as an exact match; other routes match by prefix so that
 * `/projects/some-slug` still highlights the "Projects" nav item.
 */
export function isActiveNav(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '';
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return normalized === href || normalized.startsWith(`${href}/`);
}
