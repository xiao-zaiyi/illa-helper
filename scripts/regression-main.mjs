import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML(`
  <!doctype html>
  <html>
  <body class="wxt-translation-hidden">
    <nav id="tabs" role="tablist">
      <a id="tab-guides" role="tab" href="/guides">Guides</a>
      <a id="tab-reference" role="tab" href="/reference">Reference</a>
      <a id="tab-community" role="tab" href="/community">Community</a>
    </nav>
    <nav id="plain-nav">Docs Blog Careers</nav>
    <article>
      <p id="article">
        The Ankara Summit may be
        <a id="remembered" href="https://example.com">remembered</a>
        as a <em id="turning-point">multipolar turning point</em>.
      </p>
      <div id="card" role="button">
        <span id="card-copy">Build production-grade applications with Spring.</span>
      </div>
      <button id="real-button">This real button should not be translated.</button>
      <pre id="pre">const ignored = true;</pre>
      <code id="code">inlineCodeShouldNotTranslate</code>
    </article>
  </body>
  </html>
`);

window.setTimeout = setTimeout;
window.clearTimeout = clearTimeout;
window.getComputedStyle = (element) => ({
  display: ['A', 'SPAN', 'EM'].includes(element.tagName) ? 'inline' : 'block',
  visibility: 'visible',
});

globalThis.window = window;
globalThis.document = document;
globalThis.Node = window.Node;
globalThis.Text = window.Text;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.SVGElement = window.SVGElement;
globalThis.NodeFilter = {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  SHOW_TEXT: 4,
};
globalThis.browser = {
  runtime: {
    id: 'regression-main-extension',
    onMessage: {
      addListener: () => undefined,
    },
    sendMessage: async () => true,
  },
  storage: {
    sync: {
      get: async () => ({}),
      set: async () => undefined,
    },
  },
};

const originalCrypto = globalThis.crypto;
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: {},
});

const { isTranslationCandidateNode } = await import(
  '../src/modules/processing/DomTranslationPolicy.ts'
);
const { walkAndCollectParagraphs } = await import(
  '../src/modules/processing/DomWalker.ts'
);
const { selectParagraphTranslationElements } = await import(
  '../src/modules/core/translation/ParagraphTranslationSelection.ts'
);
const { renderParagraphTranslation } = await import(
  '../src/modules/core/translation/ParagraphTranslationRenderer.ts'
);

assert.equal(
  isTranslationCandidateNode(document.querySelector('#real-button'), 1),
  false,
  '真实 button 标签仍然不能进入翻译队列',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#pre'), 1),
  false,
  'pre 代码块不能进入翻译队列',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#tabs'), 1),
  true,
  'ARIA role 不能再把可见文本整棵误杀',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#card'), 16),
  true,
  'role=button 的正文卡片应该允许进入翻译队列',
);

const selected = selectParagraphTranslationElements(
  walkAndCollectParagraphs(document.body),
);
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: originalCrypto,
});

assert.deepEqual(
  selected.map((element) => element.id),
  [
    'tab-guides',
    'tab-reference',
    'tab-community',
    'plain-nav',
    'article',
    'card',
  ],
  '段落选择应该覆盖导航、普通段落和无 p 标签正文，不能过度过滤',
);

const article = document.querySelector('#article');
renderParagraphTranslation(
  article,
  '安卡拉峰会可能被视为一个多极转折点。',
  'wxt-style-default',
);

const paragraphTranslation = article.querySelector(
  '.illa-paragraph-translation',
);
assert.equal(
  paragraphTranslation?.tagName,
  'SPAN',
  'p 译文应该挂在 p 内部，避免作为兄弟节点破坏布局',
);
assert.match(
  paragraphTranslation?.getAttribute('style') ?? '',
  /display:\s*block/,
  'p 译文必须换行显示',
);

const tab = document.querySelector('#tab-guides');
renderParagraphTranslation(tab, '指南', 'wxt-style-default');
assert.equal(
  tab.querySelector('.illa-paragraph-translation')?.tagName,
  'SPAN',
  '短 inline 导航项的译文应该贴在原元素内部',
);

console.log('main regression passed');
