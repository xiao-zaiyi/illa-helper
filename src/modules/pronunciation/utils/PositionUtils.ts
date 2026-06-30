/**
 * 定位工具类
 * 提供悬浮框定位相关的工具方法
 */

import { UI_CONSTANTS } from '../config';

export type TooltipPosition = 'top' | 'bottom' | 'auto';

export interface PositionResult {
  left: number;
  top: number;
  arrowClass: string;
}

export class PositionUtils {
  /**
   * 计算悬浮框位置
   * @param element 目标元素
   * @param tooltip 悬浮框元素
   * @param zIndex z-index值
   * @param position 位置偏好
   */
  static positionTooltip(
    element: HTMLElement,
    tooltip: HTMLElement,
    zIndex: number = UI_CONSTANTS.TOOLTIP_Z_INDEX,
    position: TooltipPosition = 'auto',
  ): void {
    // 先设置基本样式，让tooltip可以被测量
    tooltip.style.cssText = `
      position: fixed;
      visibility: hidden;
      z-index: ${zIndex};
    `;

    const positionResult = this.calculatePosition(element, tooltip, position);

    // 更新箭头样式
    const arrow = tooltip.querySelector('.wxt-tooltip-arrow');
    if (arrow) {
      arrow.className = positionResult.arrowClass;
    }

    // 应用最终位置
    tooltip.style.cssText = `
      position: fixed;
      left: ${positionResult.left}px;
      top: ${positionResult.top}px;
      z-index: ${zIndex};
      visibility: visible;
    `;
  }

  /**
   * 计算悬浮框位置
   * @param element 目标元素
   * @param tooltip 悬浮框元素
   * @param position 位置偏好
   */
  static calculatePosition(
    element: HTMLElement,
    tooltip: HTMLElement,
    position: TooltipPosition = 'auto',
  ): PositionResult {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = UI_CONSTANTS.TOOLTIP_PADDING;

    // 计算水平位置（居中对齐）
    let left = rect.left + (rect.width - tooltipRect.width) / 2;
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    // 计算垂直位置
    let top: number;
    let arrowClass: string;

    if (position === 'bottom') {
      // 强制显示在下方
      top = rect.bottom + 12;
      arrowClass = 'wxt-tooltip-arrow wxt-tooltip-arrow-top';
    } else if (position === 'top') {
      // 强制显示在上方
      top = rect.top - tooltipRect.height - 12;
      arrowClass = 'wxt-tooltip-arrow';
    } else {
      // 自动选择（优先显示在上方）
      top = rect.top - tooltipRect.height - 12;
      arrowClass = 'wxt-tooltip-arrow';

      // 如果上方空间不足，显示在下方
      if (top < padding) {
        top = rect.bottom + 12;
        arrowClass = 'wxt-tooltip-arrow wxt-tooltip-arrow-top';
      }
    }

    // 垂直边界检查
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    return { left, top, arrowClass };
  }

  /**
   * 检查元素是否在视窗内
   * @param element 目标元素
   */
  static isElementInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  /**
   * 获取元素相对于视窗的位置信息
   * @param element 目标元素
   */
  static getElementViewportInfo(element: HTMLElement): {
    rect: DOMRect;
    isInViewport: boolean;
    distanceFromTop: number;
    distanceFromBottom: number;
    distanceFromLeft: number;
    distanceFromRight: number;
  } {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    return {
      rect,
      isInViewport: this.isElementInViewport(element),
      distanceFromTop: rect.top,
      distanceFromBottom: viewportHeight - rect.bottom,
      distanceFromLeft: rect.left,
      distanceFromRight: viewportWidth - rect.right,
    };
  }
}
