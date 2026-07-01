import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML(`
  <!doctype html>
  <html>
  <body>
    <p id="host">苹果涨价。</p>
  </body>
  </html>
`);

globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;

const { applyReplacementToRange } = await import(
  '../src/modules/processing/RangeReplacementWriter.ts'
);
const { OriginalWordDisplayMode, TranslationPosition } = await import(
  '../src/modules/shared/types/core.ts'
);

const host = document.querySelector('#host');
const extracted = document.createDocumentFragment();
extracted.appendChild(document.createTextNode('苹果'));

let extractCalled = false;
let insertCalled = false;
const fakeRange = {
  extractContents() {
    extractCalled = true;
    return extracted;
  },
  insertNode(node) {
    insertCalled = true;
    host.insertBefore(node, host.firstChild);
  },
};

const result = applyReplacementToRange(
  fakeRange,
  {
    original: '苹果',
    translation: 'Apple',
    position: { start: 0, end: 2 },
    isNew: true,
  },
  {
    styleClass: 'wxt-style-default',
    originalWordDisplayMode: OriginalWordDisplayMode.LEARNING,
    translationPosition: TranslationPosition.AFTER,
    showParentheses: true,
  },
);

assert.equal(result.success, true);
assert.equal(extractCalled, true, 'Range 写入必须使用 extractContents');
assert.equal(insertCalled, true, 'Range 写入必须使用 insertNode');

const originalWrapper = host.querySelector('.wxt-original-word');
const translation = host.querySelector('.wxt-translation-term');

assert.equal(originalWrapper?.textContent, '苹果');
assert.equal(
  originalWrapper?.getAttribute('data-wxt-word-processed'),
  'true',
);
assert.equal(
  originalWrapper?.classList.contains('wxt-original-word--learning'),
  true,
);
assert.equal(translation?.textContent, ' (Apple) ');
assert.equal(translation?.getAttribute('data-original-text'), '苹果');
assert.equal(
  translation?.classList.contains('wxt-style-default'),
  true,
);
assert.equal(result.translationElement, translation);

const failingRange = {
  extractContents() {
    throw new Error('range moved');
  },
  insertNode() {
    throw new Error('should not insert');
  },
};

assert.deepEqual(
  applyReplacementToRange(
    failingRange,
    {
      original: '苹果',
      translation: 'Apple',
      position: { start: 0, end: 2 },
      isNew: true,
    },
    {
      styleClass: 'wxt-style-default',
      originalWordDisplayMode: OriginalWordDisplayMode.VISIBLE,
      translationPosition: TranslationPosition.BEFORE,
      showParentheses: false,
    },
  ),
  { success: false },
  'Range 已失效时应该失败而不是抛异常',
);

console.log('range-replacement-writer regression passed');
