/*
 * Splices the v1 upgrade into index.html.
 *   node tools/apply-upgrade.js            (rewrites index.html in place)
 * Works on string anchors, not line numbers, and refuses to run twice.
 * The same applyUpgrade() runs in a browser for previewing.
 */
(function (global) {
  'use strict';

  var MARK = '<!-- HERO (upgrade v1) -->';

  function cut(html, startIdx, endIdx, label) {
    if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
      throw new Error('apply-upgrade: could not find the ' + label + ' block in index.html');
    }
    return { before: html.slice(0, startIdx), removed: html.slice(startIdx, endIdx), after: html.slice(endIdx) };
  }
  function lineStart(html, idx) {
    return html.lastIndexOf('\n', idx) + 1;
  }

  function applyUpgrade(html, parts) {
    if (html.indexOf(MARK) !== -1) throw new Error('apply-upgrade: index.html already has the upgrade');

    // 1. Old loader, WebGL quote layer and custom cursor (and its three.js tag)
    var loadIdx = html.indexOf('id="ap-load"');
    var headerIdx = html.indexOf('<header class="top">');
    var a = cut(html, loadIdx < 0 ? -1 : lineStart(html, loadIdx), headerIdx < 0 ? -1 : lineStart(html, headerIdx), 'loader');
    if (a.removed.indexOf('three.r128.min.js') === -1) throw new Error('apply-upgrade: loader block looks different than expected');
    html = a.before + a.after;

    // 2. Old hero, 3D room, word search and their scripts (everything up to the first case sheet)
    var heroMatch = /<section\b[^>]*\bid="intro"/.exec(html);
    var heroIdx = heroMatch ? heroMatch.index : -1;
    var paidIdx = html.indexOf('<!-- PAID SOCIAL -->');
    if (paidIdx < 0) paidIdx = html.indexOf('id="paid"');
    var b = cut(html, heroIdx < 0 ? -1 : lineStart(html, heroIdx), paidIdx < 0 ? -1 : lineStart(html, paidIdx), 'hero/room/word-search');
    ['id="scrollTrack"', 'id="skillTrack"', 'matter-0.19.0.min.js'].forEach(function (needle) {
      if (b.removed.indexOf(needle) === -1) throw new Error('apply-upgrade: expected ' + needle + ' in the block being replaced');
    });
    var scripts = [
      '<script src="assets/vendor/three.r128.min.js" defer></script>',
      '<script src="assets/vendor/css3d-renderer.r128.js" defer></script>',
      '<script src="assets/js/hero.js" defer></script>',
      '<script src="assets/js/stack-matrix.js" defer></script>',
      '<script src="assets/js/showroom.js" defer></script>'
    ].join('\n');
    html = b.before + parts.hero.trim() + '\n\n' + parts.stack.trim() + '\n\n' + parts.showroom.trim() + '\n\n' + scripts + '\n\n' + b.after;

    // 3. Stylesheets
    var links = [
      '<link rel="stylesheet" href="assets/css/hero.css">',
      '<link rel="stylesheet" href="assets/css/stack-matrix.css">',
      '<link rel="stylesheet" href="assets/css/showroom.css">'
    ].join('\n');
    var headEnd = html.indexOf('</head>');
    if (headEnd < 0) throw new Error('apply-upgrade: no </head>');
    html = html.slice(0, headEnd) + links + '\n' + html.slice(headEnd);
    return html;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { applyUpgrade: applyUpgrade };
    if (require.main === module) {
      var fs = require('fs');
      var path = require('path');
      var root = path.resolve(__dirname, '..');
      var read = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };
      var file = path.join(root, 'index.html');
      var out = applyUpgrade(fs.readFileSync(file, 'utf8'), {
        hero: read('partials/hero.html'),
        stack: read('partials/stack.html'),
        showroom: read('partials/showroom.html')
      });
      fs.writeFileSync(file, out);
      console.log('index.html upgraded');
    }
  } else {
    global.applyUpgrade = applyUpgrade;
  }
})(this);
