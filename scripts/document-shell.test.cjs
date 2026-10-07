const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('the shared document has one application host and no duplicate document body', () => {
  const html = readFileSync(join(__dirname, '../src/index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['html', 'body', 'app-root']) {
    assert.equal((html.match(new RegExp('<' + tag + '(?:\\s|>)', 'gi')) || []).length, 1, `Expected one ${tag}; a second app host creates a viewport of blank space on every route`);
  }
  assert.match(html, /<\/html>\s*$/i);
});
