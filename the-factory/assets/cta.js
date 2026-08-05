/* ============================================================
   Scroll position → button colour.

   The fixed "Open in Figma" button carries a blue→purple gradient
   twice its own width; this slides the visible window across it as
   you move through the guide. Top of the page is blue, bottom is
   purple, so the button doubles as a progress indicator.

   Sets --cta-p (0…1) on <html>. The interpolation itself is CSS —
   see .plugin-cta in guide.css, or the same block inside a guide
   that carries its own stylesheet.
   ============================================================ */

(function () {
  var root = document.documentElement;
  var queued = false;

  function progress() {
    /* scrollingElement so this works whether the guide scrolls the
       document or sits in the library's right-hand pane */
    var el = document.scrollingElement || root;
    var travel = el.scrollHeight - el.clientHeight;
    if (travel <= 0) return 0;
    var p = el.scrollTop / travel;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function paint() {
    queued = false;
    root.style.setProperty('--cta-p', progress().toFixed(4));
  }

  function onScroll() {
    if (queued) return;
    /* rAF coalesces to one paint per frame, but it's throttled to a stop in
       background tabs — paint straight away there so the button isn't stale
       when the tab comes forward. */
    if (document.hidden) { paint(); return; }
    queued = true;
    requestAnimationFrame(paint);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paint();
})();
