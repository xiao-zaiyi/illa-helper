/**
 * UI相关类型定义
 */

import { PhoneticInfo } from './phonetic.types';

// 发音元素数据
export interface PronunciationElementData {
  word: string;
  element: HTMLElement;
  phonetic?: PhoneticInfo;
  tooltip?: HTMLElement;
  isMouseOver?: boolean; // 标记鼠标是否在元素上
  originalText?: string; // 新增：原文信息，存储翻译前的原始词汇
}

// 悬浮框类型
export type TooltipType = 'phrase' | 'word';

// 悬浮框状态
export interface TooltipState {
  visible: boolean;
  element: HTMLElement | null;
  type: TooltipType;
}

// 交互事件类型
export type InteractionEventType = 'mouseenter' | 'mouseleave' | 'click';

// 交互事件处理器
export interface InteractionEventHandler {
  type: InteractionEventType;
  handler: (event: Event) => void;
}

// 元素事件处理器映射
export interface ElementEventHandlers {
  mouseEnterHandler: (event: Event) => void;
  mouseLeaveHandler: (event: Event) => void;
}
