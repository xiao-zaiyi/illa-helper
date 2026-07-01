import { isProcessingResultNode as isProcessingPipelineNode } from '../../processing/DomTranslationPolicy';

/**
 * 检查节点是否是处理结果节点（翻译、发音等功能元素）
 */
export function isProcessingResultNode(node: Node): boolean {
  return isProcessingPipelineNode(node);
}

/**
 * 检查一个节点是否是节点集合中任何其他节点的后代
 */
export function isDescendant(node: Node, nodeSet: Set<Node>): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (nodeSet.has(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}
