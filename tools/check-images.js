/* check-images.js: lists which of the 12 photos exist.
   Run it with:  node tools/check-images.js
   It only READS files; it never changes anything. */
var fs = require('fs');
var path = require('path');
var JM = require('../js/data.js');

var root = path.join(__dirname, '..');
var missing = 0;
var MIN_BYTES = 40 * 1024; // under 40 KB is probably too small / low quality

JM.jewelry.forEach(function (item) {
  var src = item.images[0].src;
  var file = path.join(root, src);
  if (!fs.existsSync(file)) {
    missing++;
    console.log('  MISSING  ' + src);
    return;
  }
  var kb = Math.round(fs.statSync(file).size / 1024);
  var note = fs.statSync(file).size < MIN_BYTES ? '  (very small: check quality)' : '';
  var credit = item.images[0].credit === 'TBD' ? '  (credit still TBD)' : '';
  console.log('  ok       ' + src + '  ' + kb + ' KB' + note + credit);
});

console.log('\n' + (JM.jewelry.length - missing) + ' of ' + JM.jewelry.length + ' images found.');
if (!JM.SHOW_IMAGES) console.log('JM.SHOW_IMAGES is false: the site is still showing placeholders.');
