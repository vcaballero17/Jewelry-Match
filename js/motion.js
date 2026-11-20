/* ==========================================================
   motion.js  -  small slide-in as sections scroll into view
   ----------------------------------------------------------
   Anything marked data-reveal slides up a little the first time
   it appears. Rules I set for myself:
   - the content is ALWAYS visible (only position changes, never
     opacity), so nothing is hidden if this script fails;
   - nothing moves for people who asked their device for less motion;
   - it runs once per element, then stops watching.
   ========================================================== */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  Array.prototype.forEach.call(items, function (item) {
    // Only things still below the fold get the starting offset.
    if (item.getBoundingClientRect().top > window.innerHeight * 0.9) {
      item.classList.add('reveal');
      observer.observe(item);
    }
  });
})();
