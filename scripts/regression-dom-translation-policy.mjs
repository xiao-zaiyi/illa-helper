import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML(`
  <!doctype html>
  <html>
  <body>
    <article>
      <p id="article">苹果当时刚宣布完涨价，市值蒸发了2300多亿美元。</p>
      <button id="button">点击提交这段文字不应该被翻译</button>
      <pre id="pre">const price = apple.value;</pre>
      <code id="code">inlineCodeShouldNotTranslate</code>
      <nav id="nav">首页 关于 设置</nav>
      <p id="processed" data-wxt-text-processed="true">已经处理过的正文不应该重复翻译。</p>
      <span class="wxt-translation-term">Apple</span>
      <p id="hidden" hidden>隐藏正文不应该翻译。</p>
      <p id="dynamic">动态新增的正文内容应该允许进入翻译队列。</p>
    </article>
  </body>
  </html>
`);

globalThis.window = window;
globalThis.document = document;
globalThis.Node = window.Node;
globalThis.Text = window.Text;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.NodeFilter = {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  SHOW_TEXT: 4,
};

const { isTranslationCandidateNode, isProcessingResultNode } = await import(
  '../src/modules/processing/DomTranslationPolicy.ts'
);
const { walkAndCollectParagraphs } = await import(
  '../src/modules/processing/DomWalker.ts'
);

assert.equal(
  isTranslationCandidateNode(document.querySelector('#article'), 16),
  true,
  '普通正文应该进入翻译候选',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#button'), 16),
  false,
  '按钮文本不应该进入翻译候选',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#pre'), 1),
  false,
  'pre 代码块不应该进入翻译候选',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#code'), 1),
  false,
  'code 文本不应该进入翻译候选',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#nav'), 1),
  false,
  '导航文本不应该进入翻译候选',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#processed'), 1),
  false,
  '已处理节点不应该再次进入翻译候选',
);
assert.equal(
  isProcessingResultNode(document.querySelector('.wxt-translation-term')),
  true,
  '扩展注入的翻译结果节点应该被识别',
);
assert.equal(
  isTranslationCandidateNode(document.querySelector('#dynamic'), 16),
  true,
  '动态新增的正文应该允许进入翻译候选',
);

const paragraphs = walkAndCollectParagraphs(document.body);
const paragraphTexts = paragraphs.map((paragraph) => paragraph.textContent);

assert.ok(
  paragraphTexts.some((text) => text.includes('苹果当时')),
  'DomWalker 应该收集正文段落',
);
assert.ok(
  paragraphTexts.some((text) => text.includes('动态新增')),
  'DomWalker 应该收集动态正文段落',
);
assert.ok(
  paragraphTexts.every((text) => !text.includes('点击提交')),
  'DomWalker 不应该收集按钮文本',
);
assert.ok(
  paragraphTexts.every((text) => !text.includes('inlineCodeShouldNotTranslate')),
  'DomWalker 不应该收集代码文本',
);
assert.ok(
  paragraphTexts.every((text) => !text.includes('已经处理过')),
  'DomWalker 不应该收集已处理文本',
);

console.log(`dom-translation-policy regression passed: ${paragraphs.length} paragraphs`);
