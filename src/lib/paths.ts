/** Base-path helpers so the site works at the domain root and under a sub-path (e.g. GitHub Pages /audit-readiness/). */
export const BASE: string = import.meta.env.BASE_URL || '/';

/** "img/a.jpg" or "/img/a.jpg" -> "<base>img/a.jpg" */
export const asset = (p: string): string => BASE + p.replace(/^\//, '');

/** Path within the app, without the base: "/audit-readiness/privacy" -> "/privacy". */
export function routePath(pathname: string): string {
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '');
  return '/' + rel.replace(/\/$/, '');
}
