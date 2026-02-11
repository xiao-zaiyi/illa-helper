/**
 * 智能内容分段器
 *
 * 基于 DomWalker 的段落标记结果，将 DOM 分割为合理的处理单元。
 * 单词翻译和段落翻译共用 DomWalker 获取段落，本模块负责：
 * 1. 将段落转换为 ContentSegment
 * 2. 智能分割长文本
 * 3. 合并碎片化的小段落
 */

import {
  ContentSegment,
  globalProcessingState,
} from './ProcessingStateManager';
import { walkAndCollectParagraphs } from './DomWalker';

export interface SegmenterConfig {
  maxSegmentLength: number;
  minSegmentLength: number;
  mergeSmallSegments: boolean;
}

const DEFAULT_CONFIG: SegmenterConfig = {
  maxSegmentLength: 400,
  minSegmentLength: 20,
  mergeSmallSegments: true,
};

export class ContentSegmenter {
  private config: SegmenterConfig;

  constructor(config: Partial<SegmenterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 将根节点分割为内容段落
   */
  segmentContent(root: Node): ContentSegment[] {
    if (!(root instanceof HTMLElement)) return [];

    // 用 DomWalker 获取所有段落
    const paragraphs = walkAndCollectParagraphs(root);
    const segments: ContentSegment[] = [];

    for (const para of paragraphs) {
      if (para.textContent.trim().length < this.config.minSegmentLength) {
        continue;
      }

      const domPath = globalProcessingState.generateDomPath(para.element);

      if (para.textContent.length <= this.config.maxSegmentLength) {
        // 短文本 - 单个段落
        const fingerprint = globalProcessingState.generateContentFingerprint(
          para.textContent,
          domPath,
        );
        segments.push({
          id: `${para.element.tagName.toLowerCase()}-${fingerprint}`,
          textContent: para.textContent,
          element: para.element,
          elements: [para.element],
          textNodes: para.textNodes,
          fingerprint,
          domPath,
        });
      } else {
        // 长文本 - 按文本节点边界分割
        const subSegments = this.splitLongText(
          para.textNodes,
          para.element,
          domPath,
        );
        segments.push(...subSegments);
      }
    }

    if (this.config.mergeSmallSegments) {
      return this.mergeSmallSegments(segments);
    }

    return segments;
  }

  /**
   * 按文本节点边界分割长文本
   */
  private splitLongText(
    textNodes: Text[],
    container: Element,
    domPath: string,
  ): ContentSegment[] {
    const segments: ContentSegment[] = [];
    let currentNodes: Text[] = [];
    let currentLength = 0;
    let segmentIndex = 0;

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';

      if (
        currentLength + nodeText.length > this.config.maxSegmentLength &&
        currentNodes.length > 0
      ) {
        segments.push(
          this.buildSegment(currentNodes, container, domPath, segmentIndex),
        );
        currentNodes = [];
        currentLength = 0;
        segmentIndex++;
      }

      currentNodes.push(textNode);
      currentLength += nodeText.length;
    }

    if (currentNodes.length > 0) {
      segments.push(
        this.buildSegment(currentNodes, container, domPath, segmentIndex),
      );
    }

    return segments;
  }

  private buildSegment(
    textNodes: Text[],
    container: Element,
    domPath: string,
    index: number,
  ): ContentSegment {
    const text = textNodes.map((n) => n.textContent || '').join('');
    const path = `${domPath}[${index}]`;
    const fingerprint = globalProcessingState.generateContentFingerprint(
      text,
      path,
    );
    return {
      id: `${container.tagName.toLowerCase()}-${fingerprint}-${index}`,
      textContent: text,
      element: container,
      elements: [container],
      textNodes: [...textNodes],
      fingerprint,
      domPath: path,
    };
  }

  /**
   * 合并相邻的小段落
   */
  private mergeSmallSegments(segments: ContentSegment[]): ContentSegment[] {
    if (segments.length <= 1) return segments;

    const merged: ContentSegment[] = [];
    let group: ContentSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      group.push(segments[i]);

      const totalLength = group.reduce(
        (sum, seg) => sum + seg.textContent.length,
        0,
      );

      if (
        totalLength >= this.config.minSegmentLength * 2 ||
        i === segments.length - 1
      ) {
        if (group.length === 1) {
          merged.push(group[0]);
        } else {
          merged.push(this.createMergedSegment(group));
        }
        group = [];
      }
    }

    return merged;
  }

  private createMergedSegment(segments: ContentSegment[]): ContentSegment {
    const text = segments.map((s) => s.textContent).join('');
    const nodes = segments.flatMap((s) => s.textNodes);
    const elements = segments.map((s) => s.element);
    const domPath = segments.map((s) => s.domPath).join('|');
    const fingerprint = globalProcessingState.generateContentFingerprint(
      text,
      domPath,
    );

    return {
      id: `merged-${fingerprint}`,
      textContent: text,
      element: segments[0].element,
      elements,
      textNodes: nodes,
      fingerprint,
      domPath,
    };
  }

  updateConfig(newConfig: Partial<SegmenterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SegmenterConfig {
    return { ...this.config };
  }
}
