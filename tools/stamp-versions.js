#!/usr/bin/env node
/*
 * Adds ?v=<content hash> to every local stylesheet and script link in index.html,
 * so browsers fetch the matching files right after a deploy instead of reusing
 * copies cached for up to 10 minutes. A link only changes when its file changes.
 *
 *   node tools/stamp-versions.js           rewrite index.html in place
 *   node tools/stamp-versions.js --check   exit 1 if any tag is missing or stale
 *
 * Run it before every commit that touches a file in assets/. The tests check it.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');

function hashOf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

// read(relativePath) returns the file's bytes
function stamp(html, read) {
  return html.replace(/<(link|script)\b[^>]*>/g, function (tag, kind) {
    var attr = kind === 'link' ? 'href' : 'src';
    if (kind === 'link' && !/\brel="stylesheet"/.test(tag)) return tag;
    var re = new RegExp('(\\b' + attr + '=")(assets\\/[^"?#]+\\.(?:css|js))(?:\\?v=[0-9a-f]+)?(")');
    return tag.replace(re, function (all, pre, file, post) {
      return pre + file + '?v=' + hashOf(read(file)) + post;
    });
  });
}

module.exports = { stamp: stamp, hashOf: hashOf };

if (require.main === module) {
  var file = path.join(ROOT, 'index.html');
  var html = fs.readFileSync(file, 'utf8');
  var out = stamp(html, function (p) { return fs.readFileSync(path.join(ROOT, p)); });
  if (process.argv.indexOf('--check') !== -1) {
    if (out !== html) { console.error('stamp-versions: index.html has missing or stale version tags. Run: node tools/stamp-versions.js'); process.exit(1); }
    console.log('stamp-versions: up to date');
  } else if (out !== html) {
    fs.writeFileSync(file, out);
    console.log('stamp-versions: index.html updated');
  } else {
    console.log('stamp-versions: already up to date');
  }
}
