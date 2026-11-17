/* check-links.js - fails if any internal link, image, script, stylesheet
   or #anchor in the HTML pages points to something that does not exist.
   Run:  node tools/check-links.js                                      */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
const idsOf = {};
pages.forEach(p => {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  idsOf[p] = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
});
let problems = 0, checked = 0;
pages.forEach(p => {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    checked++;
    const [file, hash] = url.split('#');
    const target = file === '' ? p : file.split('?')[0];
    if (!fs.existsSync(path.join(root, target))) {
      console.log('MISSING FILE  ' + p + ' -> ' + url); problems++; continue;
    }
    if (hash && target.endsWith('.html') && !idsOf[target].has(hash)) {
      console.log('MISSING ANCHOR ' + p + ' -> ' + url); problems++;
    }
  }
});
console.log(problems ? problems + ' problem(s)' : 'All ' + checked + ' links OK across ' + pages.length + ' pages');
process.exit(problems ? 1 : 0);
