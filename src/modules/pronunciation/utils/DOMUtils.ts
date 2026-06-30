/**
 * DOM工具类
 * 提供DOM操作相关的工具方法
 */

import { CSS_CLASSES } from '../config';

export class DOMUtils {
  /**
   * 生成唯一的元素ID
   * @param prefix 前缀
   */
  static generateUniqueId(prefix = 'wxt'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 为元素添加唯一标识
   * @param element 目标元素
   */
  static addUniqueId(element: HTMLElement): string {
    let id = element.getAttribute('data-wxt-id');
    if (!id) {
      id = this.generateUniqueId();
      element.setAttribute('data-wxt-id', id);
    }
    return id;
  }

  /**
   * 获取元素的唯一键
   * @param element 目标元素
   */
  static getElementKey(element: HTMLElement): string {
    return element.getAttribute('data-wxt-id') || 'unknown';
  }

  /**
   * 清理指定选择器的所有元素
   * @param selector CSS选择器
   */
  static cleanupElements(selector: string): void {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      try {
        element.remove();
      } catch (_) {
        console.info(_);
      }
    });
  }

  /**
   * 创建内联音标元素
   * @param phoneticText 音标文本
   */
  static createPhoneticInlineElement(phoneticText: string): HTMLElement {
    const phoneticSpan = document.createElement('span');
    phoneticSpan.className = CSS_CLASSES.PHONETIC_INLINE;
    phoneticSpan.textContent = ` ${phoneticText}`;
    phoneticSpan.style.cssText = `
      font-size: 0.85em;
      color: #666;
      margin-left: 2px;
      font-style: italic;
    `;
    return phoneticSpan;
  }

  /**
   * 提取单词列表
   * @param text 文本
   */
  static extractWords(text: string): string[] {
    return text
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0 && /^[a-zA-Z\-']+$/.test(word))
      .map((word) => word.replace(/^[^\w\-']+|[^\w\-']+$/g, ''))
      .filter((word) => word.length > 0);
  }

  /**
   * 检查元素是否具有指定的CSS类
   * @param element 目标元素
   * @param className CSS类名
   */
  static hasClass(element: HTMLElement, className: string): boolean {
    return element.classList.contains(className);
  }

  /**
   * 安全地添加CSS类
   * @param element 目标元素
   * @param className CSS类名
   */
  static addClass(element: HTMLElement, className: string): void {
    if (!this.hasClass(element, className)) {
      element.classList.add(className);
    }
  }

  /**
   * 安全地移除CSS类
   * @param element 目标元素
   * @param className CSS类名
   */
  static removeClass(element: HTMLElement, className: string): void {
    if (this.hasClass(element, className)) {
      element.classList.remove(className);
    }
  }

  /**
   * 切换CSS类
   * @param element 目标元素
   * @param className CSS类名
   */
  static toggleClass(element: HTMLElement, className: string): boolean {
    return element.classList.toggle(className);
  }

  /**
   * 安全地设置元素属性
   * @param element 目标元素
   * @param name 属性名
   * @param value 属性值
   */
  static setAttribute(element: HTMLElement, name: string, value: string): void {
    try {
      element.setAttribute(name, value);
    } catch (e) {
      console.warn(`设置属性失败: ${name}=${value}`, e);
    }
  }

  /**
   * 安全地获取元素属性
   * @param element 目标元素
   * @param name 属性名
   * @param defaultValue 默认值
   */
  static getAttribute(
    element: HTMLElement,
    name: string,
    defaultValue = '',
  ): string {
    try {
      return element.getAttribute(name) || defaultValue;
    } catch (e) {
      console.warn(`获取属性失败: ${name}`, e);
      return defaultValue;
    }
  }

  /**
   * 查找最近的具有指定类名的父元素
   * @param element 起始元素
   * @param className CSS类名
   */
  static findClosestWithClass(
    element: HTMLElement,
    className: string,
  ): HTMLElement | null {
    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      if (this.hasClass(current, className)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}
