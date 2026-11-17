/* ==========================================================
   home.js  -  the two small jobs on the Home page
   1. Fill "A first look" with three cards from the shared data.
   2. When someone taps a quick pick, remember the place they
      chose, so the quiz opens at step 2 with it already set.
   ========================================================== */
(function () {
  'use strict';

  var JM = window.JM;

  /* ----- 1. First look: three pieces from different parts of the body ----- */
  var FEATURED = ['drop-study', 'kite-pinky', 'melt-collar'];
  var holder = document.getElementById('featured');

  FEATURED.forEach(function (id) {
    var item = JM.jewelry.filter(function (j) { return j.id === id; })[0];
    if (item) holder.appendChild(JM.ui.objectCard(item, { headingLevel: 'h3' }));
  });

  /* ----- 2. Quick picks start the quiz one step further along.
         The link still goes to match.html. We only save the choice first. ----- */
  var picks = document.querySelectorAll('.quickpick');
  Array.prototype.forEach.call(picks, function (link) {
    link.addEventListener('click', function () {
      var value = link.getAttribute('data-placement');
      var allowed = JM.OPTIONS.placement.some(function (opt) { return opt.value === value; });
      if (allowed) {
        JM.storage.saveProgress({ step: 1, answers: { placement: value } });
      }
    });
  });
})();
