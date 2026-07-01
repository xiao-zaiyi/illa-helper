import assert from 'node:assert/strict';

const { planStableReplacements } = await import(
  '../src/modules/processing/ReplacementPlanner.ts'
);
const { ReplacementBudget } = await import(
  '../src/modules/processing/ReplacementBudget.ts'
);

const repeatedText = '苹果涨价后，苹果市值蒸发。';
const repeatedPlan = planStableReplacements(repeatedText, [
  {
    original: '苹果',
    translation: 'Apple',
    position: { start: 6, end: 8 },
    isNew: true,
  },
]);

assert.equal(repeatedPlan.length, 1);
assert.deepEqual(
  repeatedPlan[0].position,
  { start: 6, end: 8 },
  '重复词位置有效时必须保留原位置，不能重定位到第一处',
);

const stalePlan = planStableReplacements(repeatedText, [
  {
    original: '苹果',
    translation: 'Apple',
    position: { start: 11, end: 13 },
    isNew: true,
  },
]);

assert.equal(
  stalePlan.length,
  0,
  '位置明显失效时不应该用全局 indexOf 重定位到第一处重复词',
);

const overlapPlan = planStableReplacements('苹果公司宣布涨价。', [
  {
    original: '苹果公司',
    translation: 'Apple',
    position: { start: 0, end: 4 },
    isNew: true,
  },
  {
    original: '苹果',
    translation: 'Apple',
    position: { start: 0, end: 2 },
    isNew: true,
  },
]);

assert.equal(overlapPlan.length, 1, '重叠替换项只能保留一个');
assert.equal(overlapPlan[0].original, '苹果公司');

const shiftedText = '苹果当时刚宣布完涨价。';
const shiftedPlan = planStableReplacements(shiftedText, [
  {
    original: '刚',
    translation: 'just',
    position: { start: 5, end: 6 },
    isNew: true,
  },
]);

assert.deepEqual(
  shiftedPlan[0].position,
  { start: 4, end: 5 },
  '轻微 DOM 文本变化时允许在原位置附近修正',
);

const budget = ReplacementBudget.fromText('苹果当时刚宣布完涨价。', 0.5);
const taken = budget.take([
  {
    original: '苹果',
    translation: 'Apple',
    position: { start: 0, end: 2 },
    isNew: true,
  },
  {
    original: '当时',
    translation: 'at that time',
    position: { start: 2, end: 4 },
    isNew: true,
  },
]);
const remainingAfterTake = budget.getRemainingCount();
budget.restore(1);
assert.equal(
  budget.getRemainingCount(),
  remainingAfterTake + 1,
  'DOM 写入失败时应该把未落地的预算还回去',
);
assert.equal(taken.length, 2);

console.log('replacement-planner regression passed');
