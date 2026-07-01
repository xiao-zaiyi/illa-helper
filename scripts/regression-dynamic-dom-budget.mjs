import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML(`
  <!doctype html>
  <html>
  <body>
    <p>苹果当时刚宣布完涨价，市值蒸发了2300多亿美元。</p>
    <p id="dynamic">现在重点高管又跑了，市场继续震荡。</p>
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
globalThis.Text = window.Text;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.NodeFilter = {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  SHOW_TEXT: 4,
};

const { ProcessingService } = await import(
  '../src/modules/content/services/ProcessingService.ts'
);
const { ReplacementBudget } = await import(
  '../src/modules/processing/ReplacementBudget.ts'
);
const { ProcessingCoordinator } = await import(
  '../src/modules/processing/ProcessingCoordinator.ts'
);
const { globalProcessingState } = await import(
  '../src/modules/processing/ProcessingStateManager.ts'
);

const processRootCalls = [];
const processSegmentsCalls = [];
const textProcessor = {
  processRoot: async (...args) => {
    processRootCalls.push(args);
  },
  getPronunciationService: () => undefined,
  updateApiConfig: () => undefined,
};
const textReplacer = {
  getConfig: () => ({ replacementRate: 0.1 }),
};
const settings = {
  originalWordDisplayMode: 'visible',
  maxLength: 400,
  translationPosition: 'after',
  showParentheses: true,
  apiConfigs: [],
  activeApiConfigId: '',
  lazyLoading: { enabled: false },
};

const service = new ProcessingService(
  textProcessor,
  textReplacer,
  settings,
  undefined,
);

const originalProcessSegments = ProcessingCoordinator.prototype.processSegments;
ProcessingCoordinator.prototype.processSegments = async function (...args) {
  processSegmentsCalls.push(args);
  return {
    success: true,
    replacementCount: 0,
    segmentCount: args[0].length,
    skippedCount: 0,
    duration: 0,
  };
};

await service.processPage();
assert.equal(
  processSegmentsCalls.length,
  1,
  '整页处理应该直接处理已分段内容',
);

const pageBudget = processSegmentsCalls[0][6];
assert.ok(
  pageBudget instanceof ReplacementBudget,
  '整页处理应该创建页面级预算并传给 ProcessingCoordinator',
);

const dynamicNode = document.querySelector('#dynamic');
await service.processNode(dynamicNode);

assert.equal(
  processRootCalls[0][6],
  pageBudget,
  '动态 DOM 节点处理必须继续使用同一个页面级预算',
);

ProcessingCoordinator.prototype.processSegments = originalProcessSegments;
globalProcessingState.destroy();

console.log('dynamic-dom-budget regression passed');
