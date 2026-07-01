import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML(`
  <!doctype html>
  <html>
  <body>
    <main>
      <p class="item">苹果当时刚宣布完涨价。</p>
      <p class="item">苹果当时刚宣布完涨价。</p>
    </main>
  </body>
  </html>
`);

globalThis.window = {
  ...window,
  setInterval,
  clearInterval,
};
globalThis.document = document;
globalThis.Node = window.Node;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;

const { ProcessingStateManager, globalProcessingState } = await import(
  '../src/modules/processing/ProcessingStateManager.ts'
);

const state = new ProcessingStateManager();
const text = '苹果当时刚宣布完涨价。';
const firstPath = 'main > p.item:nth-child(1)';
const secondPath = 'main > p.item:nth-child(2)';

const originalNow = Date.now;
Date.now = () => 1_000;
const initialFingerprint = state.generateContentFingerprint(text, firstPath);
Date.now = () => 61_000;
const laterFingerprint = state.generateContentFingerprint(text, firstPath);
Date.now = originalNow;

assert.equal(
  laterFingerprint,
  initialFingerprint,
  '同一文本和 DOM 路径的指纹不应该随时间变化',
);

assert.notEqual(
  state.generateContentFingerprint(text, firstPath),
  state.generateContentFingerprint(text, secondPath),
  '相同文本出现在不同 DOM 位置时应该区分开',
);

assert.equal(
  state.markProcessingStart(initialFingerprint),
  true,
  '第一次处理应该能进入 active 状态',
);
assert.equal(
  state.markProcessingStart(initialFingerprint),
  false,
  '同一指纹正在处理中时不应该重复进入处理队列',
);

state.markProcessingComplete(initialFingerprint, firstPath, 1, true);

assert.equal(
  state.isContentProcessed(initialFingerprint),
  true,
  '处理完成后同一指纹应该被识别为已处理',
);
assert.equal(
  state.markProcessingStart(initialFingerprint),
  false,
  '已处理内容不应该再次进入处理队列',
);

state.destroy();
globalProcessingState.destroy();

console.log('processing-state regression passed');
