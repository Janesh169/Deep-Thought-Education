#!/usr/bin/env node
/**
 * TeX → KaTeX HTML for tools/add_chapter.py.
 *
 * Reads a JSON array of [tex, display] pairs on stdin and writes a JSON array of HTML strings.
 * Uses KaTeX 0.19.1 (the version whose CSS and fonts are in assets/app.css) in HTML-only output,
 * exactly like the existing chapters, plus the mhchem extension for \ce{…} chemistry.
 *
 * KaTeX is looked up in tools/node_modules first (cd tools && npm install), then on NODE_PATH.
 */
'use strict';
const path = require('path');
let katex;
try { katex = require(path.join(__dirname, 'node_modules', 'katex')); }
catch (e) { katex = require('katex'); }
try { require(path.join(path.dirname(require.resolve(path.join(__dirname, 'node_modules', 'katex'))), 'contrib', 'mhchem.js')); }
catch (e) { require('katex/contrib/mhchem'); }

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  const items = JSON.parse(input);
  const out = [];
  const errors = [];
  items.forEach(([tex, display], i) => {
    try {
      out.push(katex.renderToString(tex, { displayMode: !!display, output: 'html', throwOnError: true, strict: 'ignore' }));
    } catch (e) {
      errors.push('#' + i + ' ' + JSON.stringify(tex) + ': ' + e.message);
      out.push('');
    }
  });
  if (errors.length) { process.stderr.write(errors.join('\n') + '\n'); process.exit(1); }
  process.stdout.write(JSON.stringify(out));
});
