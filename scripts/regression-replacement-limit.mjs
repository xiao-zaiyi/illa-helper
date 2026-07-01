import assert from 'node:assert/strict';

const text =
  '苹果当时刚宣布完涨价，市值蒸发了2300多亿美元。现在重点高管又跑了。';

const aiOutput = [
  '苹果||Apple',
  '当时||at that time',
  '刚||just',
  '宣布||announced',
  '涨价||price increase',
  '市值||market value',
  '蒸发||evaporated',
  '重点||key',
  '高管||senior executives',
  '跑了||left',
].join('\n');

const { StructuredTextParser } = await import(
  '../src/modules/api/utils/structuredTextParser.ts'
);
const { addPositionsToReplacements } = await import(
  '../src/modules/api/utils/textUtils.ts'
);
const { ReplacementBudget } = await import(
  '../src/modules/processing/ReplacementBudget.ts'
);

const parsed = StructuredTextParser.parse(aiOutput);
assert.equal(parsed.success, true);

const replacements = addPositionsToReplacements(text, parsed.replacements, {
  replacementRate: 0.1,
});

assert.ok(
  replacements.length <= 2,
  `低替换比例应该最多落 2 个替换项，实际落了 ${replacements.length} 个`,
);

const disabledReplacements = addPositionsToReplacements(
  text,
  parsed.replacements,
  { replacementRate: 0 },
);
assert.equal(
  disabledReplacements.length,
  0,
  '替换比例为 0 时不应该落任何替换项',
);

const lazySegments = [
  { textContent: '苹果当时刚宣布完涨价，市值蒸发了。' },
  { textContent: '现在重点高管又跑了，市场继续震荡。' },
];
const pageBudget = ReplacementBudget.fromSegments(lazySegments, 0.1);
const firstLazyBatch = pageBudget.take(
  addPositionsToReplacements(lazySegments[0].textContent, parsed.replacements),
);
const secondLazyBatch = pageBudget.take(
  addPositionsToReplacements(lazySegments[1].textContent, parsed.replacements),
);
assert.ok(
  firstLazyBatch.length + secondLazyBatch.length <= 2,
  `懒加载多批次必须共享页面预算，实际落了 ${
    firstLazyBatch.length + secondLazyBatch.length
  } 个`,
);

console.log(
  `replacement-limit regression passed: ${replacements.length} replacements`,
);
