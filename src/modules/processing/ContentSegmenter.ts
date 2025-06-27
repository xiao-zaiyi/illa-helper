/**
 * 智能内容分段器
 * 负责将DOM结构智能分割为合理的处理单元，避免重复处理嵌套结构
 */

import {
  ContentSegment,
  globalProcessingState,
} from './ProcessingStateManager';
import { BLOCK_TAGS, IGNORE_SELECTORS } from '../shared/constants';

/**
 * 内容分段器配置
 */
export interface SegmenterConfig {
  /** 最大段落长度 */
  maxSegmentLength: number;
  /** 最小段落长度 */
  minSegmentLength: number;
  /** 是否启用智能边界检测 */
  enableSmartBoundary: boolean;
  /** 是否合并小段落 */
  mergeSmallSegments: boolean;
}

const DEFAULT_CONFIG: SegmenterConfig = {
  maxSegmentLength: 400,
  minSegmentLength: 20,
  enableSmartBoundary: true,
  mergeSmallSegments: true,
};

/**
 * 智能内容分段器
 *
 * 核心功能：
 * 1. 识别真正的内容边界，避免重复处理嵌套结构
 * 2. 智能分割长文本，保持语义完整性
 * 3. 合并碎片化的小段落，提高处理效率
 * 4. 生成唯一的内容段落标识符
 */
export class ContentSegmenter {
  private config: SegmenterConfig;

  constructor(config: Partial<SegmenterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 将根节点分割为内容段落
   * 主要入口方法，返回所有需要处理的内容段落
   */
  segmentContent(root: Node): ContentSegment[] {
    const segments: ContentSegment[] = [];

    // 第一步：找到所有叶子内容容器
    const leafContainers = this.findLeafContentContainers(root);

    // 第二步：为每个容器提取内容段落
    for (const container of leafContainers) {
      const containerSegments = this.extractSegmentsFromContainer(container);
      segments.push(...containerSegments);
    }

    // 第三步：去除重复的段落
    const deduplicatedSegments = this.deduplicateSegments(segments);

    // 第四步：合并小段落（如果启用）
    if (this.config.mergeSmallSegments) {
      return this.mergeSmallSegments(deduplicatedSegments);
    }

    return deduplicatedSegments;
  }

  /**
   * 找到所有叶子内容容器
   * 叶子容器：包含文本内容但不包含其他块级元素的元素
   */
  private findLeafContentContainers(root: Node): Element[] {
    const containers: Element[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const element = node as Element;

        // 跳过忽略的元素
        if (this.shouldIgnoreElement(element)) {
          return NodeFilter.FILTER_REJECT;
        }

        // 检查是否是叶子内容容器
        if (this.isLeafContentContainer(element)) {
          return NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_SKIP;
      },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
      containers.push(node as Element);
    }

    return containers;
  }

  /**
   * 判断元素是否是叶子内容容器
   */
  private isLeafContentContainer(element: Element): boolean {
    // 必须包含文本内容
    const textContent = this.getTextContent(element);
    if (!textContent || textContent.length < this.config.minSegmentLength) {
      return false;
    }

    // 检查是否有父元素已经被识别为内容容器
    // 如果有，则跳过此元素以避免重复处理
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      // 如果父元素也是叶子容器且包含当前元素的所有文本，则跳过当前元素
      if (this.couldBeLeafContainer(parent)) {
        const parentText = this.getTextContent(parent);
        if (parentText.includes(textContent)) {
          return false;
        }
      }
      parent = parent.parentElement;
    }

    // 不能包含块级子元素
    const blockChildren = element.querySelectorAll(
      Array.from(BLOCK_TAGS)
        .map((tag) => tag.toLowerCase())
        .join(', '),
    );

    // 允许包含少量简单的块级元素（如 span 包装）
    if (blockChildren.length > 3) {
      return false;
    }

    // 检查是否有复杂的嵌套结构
    for (const child of blockChildren) {
      if (this.getTextContent(child).length > 100) {
        return false; // 子块级元素包含大量文本，不是叶子容器
      }
    }

    return true;
  }

  /**
   * 快速检查元素是否可能是叶子容器（不进行父元素检查，避免循环）
   */
  private couldBeLeafContainer(element: Element): boolean {
    const textContent = this.getTextContent(element);
    if (!textContent || textContent.length < this.config.minSegmentLength) {
      return false;
    }

    const blockChildren = element.querySelectorAll(
      Array.from(BLOCK_TAGS)
        .map((tag) => tag.toLowerCase())
        .join(', '),
    );

    if (blockChildren.length > 3) {
      return false;
    }

    for (const child of blockChildren) {
      if (this.getTextContent(child).length > 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * 从容器中提取内容段落
   */
  private extractSegmentsFromContainer(container: Element): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const textNodes = this.getTextNodes(container);

    if (textNodes.length === 0) {
      return segments;
    }

    // 获取完整文本内容
    const fullText = textNodes.map((node) => node.textContent || '').join('');
    const domPath = globalProcessingState.generateDomPath(container);

    // 如果文本较短，作为单个段落处理
    if (fullText.length <= this.config.maxSegmentLength) {
      const fingerprint = globalProcessingState.generateContentFingerprint(
        fullText,
        domPath,
      );

      segments.push({
        id: `${container.tagName.toLowerCase()}-${fingerprint}`,
        textContent: fullText,
        element: container,
        elements: [container],
        textNodes: textNodes,
        fingerprint: fingerprint,
        domPath: domPath,
      });
    } else {
      // 智能分割长文本
      const subSegments = this.splitLongText(textNodes, container, domPath);
      segments.push(...subSegments);
    }

    return segments;
  }

  /**
   * 智能分割长文本
   */
  private splitLongText(
    textNodes: Text[],
    container: Element,
    domPath: string,
  ): ContentSegment[] {
    const segments: ContentSegment[] = [];
    let currentNodes: Text[] = [];
    let segmentIndex = 0;

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';

      // 计算当前累积的文本长度（使用一致的方式）
      const currentText = currentNodes
        .map((node) => node.textContent || '')
        .join('');

      // 检查是否会超过最大长度
      if (
        currentText.length + nodeText.length > this.config.maxSegmentLength &&
        currentNodes.length > 0
      ) {
        // 创建当前段落（使用一致的文本构建方式）
        const finalText = currentNodes
          .map((node) => node.textContent || '')
          .join('');
        const fingerprint = globalProcessingState.generateContentFingerprint(
          finalText,
          `${domPath}[${segmentIndex}]`,
        );
        segments.push({
          id: `${container.tagName.toLowerCase()}-${fingerprint}-${segmentIndex}`,
          textContent: finalText,
          element: container,
          elements: [container],
          textNodes: [...currentNodes],
          fingerprint: fingerprint,
          domPath: `${domPath}[${segmentIndex}]`,
        });

        // 重置累积器
        currentNodes = [];
        segmentIndex++;
      }

      currentNodes.push(textNode);
    }

    // 处理最后一个段落（使用一致的文本构建方式）
    if (currentNodes.length > 0) {
      const finalText = currentNodes
        .map((node) => node.textContent || '')
        .join('');
      const fingerprint = globalProcessingState.generateContentFingerprint(
        finalText,
        `${domPath}[${segmentIndex}]`,
      );
      segments.push({
        id: `${container.tagName.toLowerCase()}-${fingerprint}-${segmentIndex}`,
        textContent: finalText,
        element: container,
        elements: [container],
        textNodes: currentNodes,
        fingerprint: fingerprint,
        domPath: `${domPath}[${segmentIndex}]`,
      });
    }

    return segments;
  }

  /**
   * 合并小段落
   */
  private mergeSmallSegments(segments: ContentSegment[]): ContentSegment[] {
    if (segments.length <= 1) {
      return segments;
    }

    const merged: ContentSegment[] = [];
    let currentGroup: ContentSegment[] = [];

    for (const segment of segments) {
      currentGroup.push(segment);

      // 计算当前组的总长度
      const totalLength = currentGroup.reduce(
        (sum, seg) => sum + seg.textContent.length,
        0,
      );

      // 如果达到合理长度或者是最后一个段落，创建合并段落
      if (
        totalLength >= this.config.minSegmentLength * 2 ||
        segments.indexOf(segment) === segments.length - 1
      ) {
        if (currentGroup.length === 1) {
          // 单个段落，直接添加
          merged.push(currentGroup[0]);
        } else {
          // 多个段落，合并
          const mergedSegment = this.createMergedSegment(currentGroup);
          merged.push(mergedSegment);
        }
        currentGroup = [];
      }
    }

    return merged;
  }

  /**
   * 创建合并段落
   */
  private createMergedSegment(segments: ContentSegment[]): ContentSegment {
    const combinedText = segments.map((seg) => seg.textContent).join('');
    const combinedNodes = segments.reduce(
      (acc, seg) => acc.concat(seg.textNodes),
      [] as Text[],
    );
    const primaryElement = segments[0].element;
    // 收集所有相关的DOM元素
    const allElements = segments.map((seg) => seg.element);
    const combinedDomPath = segments.map((seg) => seg.domPath).join('|');

    const fingerprint = globalProcessingState.generateContentFingerprint(
      combinedText,
      combinedDomPath,
    );

    return {
      id: `merged-${fingerprint}`,
      textContent: combinedText,
      element: primaryElement,
      elements: allElements,
      textNodes: combinedNodes,
      fingerprint: fingerprint,
      domPath: combinedDomPath,
    };
  }

  /**
   * 获取元素的所有文本节点
   */
  private getTextNodes(element: Element): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.textContent?.trim();
        if (!text) {
          return NodeFilter.FILTER_REJECT;
        }

        // 检查父元素是否被忽略
        const parent = node.parentElement;
        if (parent && this.shouldIgnoreElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    return textNodes;
  }

  /**
   * 获取元素的纯文本内容
   */
  private getTextContent(element: Element): string {
    const textNodes = this.getTextNodes(element);
    return textNodes
      .map((node) => node.textContent || '')
      .join('')
      .trim();
  }

  /**
   * 判断元素是否应该被忽略
   */
  private shouldIgnoreElement(element: Element): boolean {
    // 检查是否匹配忽略选择器
    if (element.matches(IGNORE_SELECTORS)) {
      return true;
    }

    // 检查是否隐藏
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return true;
    }

    // 检查是否已处理过
    if (
      element.hasAttribute('data-wxt-text-processed') ||
      element.hasAttribute('data-wxt-word-processed')
    ) {
      return true;
    }

    // 检查是否包含翻译相关的元素（避免重复处理已翻译的内容）
    if (
      element.querySelector('.wxt-translation-term') ||
      element.querySelector('.wxt-original-word') ||
      element.classList.contains('wxt-translation-term') ||
      element.classList.contains('wxt-original-word')
    ) {
      return true;
    }

    // 检查元素是否在已翻译的父容器内
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (
        parent.hasAttribute('data-wxt-text-processed') ||
        parent.hasAttribute('data-wxt-word-processed')
      ) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SegmenterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SegmenterConfig {
    return { ...this.config };
  }

  /**
   * 去除重复的段落
   * 确保没有重叠或重复的内容段落
   */
  private deduplicateSegments(segments: ContentSegment[]): ContentSegment[] {
    const uniqueSegments: ContentSegment[] = [];
    const processedTexts = new Set<string>();

    // 按文本长度降序排序，优先保留长段落
    const sortedSegments = segments.sort(
      (a, b) => b.textContent.length - a.textContent.length,
    );

    for (const segment of sortedSegments) {
      const normalizedText = segment.textContent.trim().replace(/\s+/g, ' ');
      let isDuplicate = false;

      // 检查是否与已添加的段落重复
      for (const existingText of processedTexts) {
        // 如果当前段落是已存在段落的子集
        if (existingText.includes(normalizedText)) {
          isDuplicate = true;
          break;
        }

        // 如果当前段落包含已存在的段落，移除较短的
        if (normalizedText.includes(existingText)) {
          processedTexts.delete(existingText);
          // 移除对应的段落
          const indexToRemove = uniqueSegments.findIndex(
            (s) => s.textContent.trim().replace(/\s+/g, ' ') === existingText,
          );
          if (indexToRemove !== -1) {
            uniqueSegments.splice(indexToRemove, 1);
          }
        }
      }

      // 检查DOM元素重叠
      if (!isDuplicate) {
        for (const existingSegment of uniqueSegments) {
          const hasOverlap = segment.elements.some((element) =>
            existingSegment.elements.some(
              (existingElement) =>
                element === existingElement ||
                element.contains(existingElement) ||
                existingElement.contains(element),
            ),
          );

          if (hasOverlap) {
            // 保留文本更长的段落
            if (
              segment.textContent.length <= existingSegment.textContent.length
            ) {
              isDuplicate = true;
              break;
            } else {
              // 移除较短的现有段落
              const indexToRemove = uniqueSegments.indexOf(existingSegment);
              if (indexToRemove !== -1) {
                uniqueSegments.splice(indexToRemove, 1);
                processedTexts.delete(
                  existingSegment.textContent.trim().replace(/\s+/g, ' '),
                );
              }
            }
          }
        }
      }

      if (!isDuplicate) {
        uniqueSegments.push(segment);
        processedTexts.add(normalizedText);
      }
    }

    return uniqueSegments;
  }
}
