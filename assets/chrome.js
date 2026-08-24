/* =============================================================================
   The nav is fixed, and the chapters underneath it are pinned to the viewport —
   so where the copy may start is decided by how tall the nav happens to be.
   That height is not a constant: the button inside it changes size at two
   breakpoints, and the wordmark drops out at a third.

   Guessing it is what put the hero headline across the wordmark. So it is
   measured, published as --nav-h, and re-measured whenever it could change —
   including once the webfonts land, which is the one that bites you in
   testing because the number is right until it suddenly is not.
   ========================================================================== */
export function trackNavHeight() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const set = () =>
    document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(nav);
  else addEventListener('resize', set, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
}
