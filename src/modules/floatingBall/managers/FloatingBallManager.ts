/**
 * 悬浮球管理器
 * 负责在页面上创建和管理翻译悬浮球
 */

import type { FloatingBallConfig } from '../../shared/types/ui';
import type { FloatingBallState, FloatingBallActionType } from '../types';
import {
  FLOATING_BALL_STYLES,
  DRAG_CONFIG,
  MENU_STYLES,
  MENU_ACTIONS,
} from '../config';
import { safeSetInnerHTML } from '@/src/utils';
import { StorageService } from '../../core/storage';

export class FloatingBallManager {
  private config: FloatingBallConfig;
  private state: FloatingBallState;
  private ballElement: HTMLElement | null = null;
  private menuContainer: HTMLElement | null = null;
  private dragStartY = 0;
  private ballStartY = 0;
  private onTranslateCallback?: () => void;
  private savePositionTimer: number | null = null;

  private storageService: StorageService;
  // 事件监听器引用管理
  private eventListeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
  }> = [];
  // 双击和触摸检测
  private lastClickTime = 0;
  private clickDebounceTimer: number | null = null;
  private isTouchDevice = false;
  // 菜单悬停相关
  private menuHoverTimer: number | null = null;
  private menuItemsEventsBound = false; // 防止重复绑定菜单项事件

  constructor(config: FloatingBallConfig) {
    this.config = config;
    this.state = {
      isDragging: false,
      isVisible: false,
      isMenuExpanded: false,
      currentPosition: config.position,
    };

    // 初始化服务
    this.storageService = StorageService.getInstance();

    // 初始化触摸设备检测
    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * 统一的事件监听器绑定方法
   */
  private bindEventListener<K extends keyof DocumentEventMap>(
    target: EventTarget,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  private bindEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): void;
  private bindEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener | ((ev: Event) => unknown),
    options?: boolean | AddEventListenerOptions,
  ): void {
    const wrappedListener = listener as EventListener;
    target.addEventListener(type, wrappedListener, options);
    this.eventListeners.push({
      target,
      type,
      listener: wrappedListener,
      options,
    });
  }

  /**
   * 清理所有事件监听器
   */
  private removeAllEventListeners(): void {
    this.eventListeners.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
    this.eventListeners = [];
  }

  /**
   * 初始化悬浮球
   */
  init(onTranslate?: () => void): void {
    this.onTranslateCallback = onTranslate;

    if (this.config.enabled) {
      this.createBall();
      this.setupEventListeners();
      this.state.isVisible = true;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: FloatingBallConfig): void {
    const wasEnabled = this.config.enabled;
    this.config = config;
    this.state.currentPosition = config.position;

    if (config.enabled && !wasEnabled) {
      // 从禁用变为启用
      this.createBall();
      this.setupEventListeners();
      this.state.isVisible = true;
    } else if (!config.enabled && wasEnabled) {
      // 从启用变为禁用
      this.destroy();
      this.state.isVisible = false;
    } else if (config.enabled && this.ballElement) {
      // 更新样式
      this.updateBallStyle();
      // 确保位置精确
      this.calibratePosition();
    }
  }

  /**
   * 创建悬浮球元素
   */
  private createBall(): void {
    if (this.ballElement) {
      this.ballElement.remove();
    }

    this.ballElement = document.createElement('div');
    this.ballElement.className = 'wxt-floating-ball';
    safeSetInnerHTML(this.ballElement, this.createBallIcon());

    // 设置初始tooltip
    this.updateTooltipText();

    this.updateBallStyle();
    this.createMenu();
    document.body.appendChild(this.ballElement);
  }

  /**
   * 创建菜单容器
   */
  private createMenu(): void {
    if (this.menuContainer) {
      this.menuContainer.remove();
    }

    this.menuContainer = document.createElement('div');
    this.menuContainer.className = 'wxt-floating-menu';
    safeSetInnerHTML(this.menuContainer, this.createMenuItems());

    this.updateMenuStyle();
    document.body.appendChild(this.menuContainer);
  }

  /**
   * 创建菜单项
   */
  private createMenuItems(): string {
    return MENU_ACTIONS.map(
      (action, _) => `
      <div class="wxt-menu-item" data-action="${action.id}" title="${action.label}" >
        <span class="wxt-menu-icon" style="color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: bold;">${action.icon}</span>
      </div>
    `,
    ).join('');
  }

  /**
   * 创建悬浮球图标
   *
   * 根据翻译状态动态生成不同的视觉效果：
   * - 无翻译内容：默认紫蓝渐变背景 + 蓝色状态点（准备翻译）
   * - 显示翻译：紫蓝渐变背景 + 绿色状态点（翻译模式）
   * - 隐藏翻译：粉红渐变背景 + 红色状态点（原文模式）
   *
   * @returns SVG图标字符串
   */
  private createBallIcon(): string {
    const { iconSize } = FLOATING_BALL_STYLES;

    // 检查翻译状态
    const hasTranslatedContent =
      document.querySelector('.wxt-translation-term') !== null;
    const isTranslationHidden = document.body.classList.contains(
      'wxt-translation-hidden',
    );

    // 定义三种状态
    let stateConfig;
    if (!hasTranslatedContent) {
      // 无翻译内容 - 默认状态（准备翻译）
      stateConfig = {
        colors: { start: '#667eea', end: '#764ba2', dot: '#4f7cff' },
        opacity: '0.9',
      };
    } else if (isTranslationHidden) {
      // 有翻译内容但被隐藏 - 原文模式
      stateConfig = {
        colors: { start: '#f093fb', end: '#f5576c', dot: '#ff6b6b' },
        opacity: '0.8',
      };
    } else {
      // 有翻译内容且可见 - 翻译模式
      stateConfig = {
        colors: { start: '#667eea', end: '#764ba2', dot: '#00ff88' },
        opacity: '1',
      };
    }

    // 翻译图标路径（统一使用同一个图标）
    const iconPath =
      'M16 10h2l4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16 10zm1 2.885L15.753 16h2.492L17 12.885zM3 4h10v2H9v7h4v2H9v4H7v-4H3v-2h4V6H3V4zM17 3a4 4 0 0 1 4 4v2h-2V7a2 2 0 0 0-2-2h-3V3h3zM5 15v2a2 2 0 0 0 2 2h3v2H7a4 4 0 0 1-4-4v-2h2z';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${stateConfig.colors.start};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${stateConfig.colors.end};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${iconSize}" height="${iconSize}" fill="url(#bgGradient)" rx="4" ry="4" opacity="${stateConfig.opacity}"/>
        <path d="${iconPath}" fill="white" opacity="0.9"/>
        <circle cx="18" cy="6" r="2" fill="${stateConfig.colors.dot}" opacity="0.9"/>
      </svg>
    `;
  }

  /**
   * 注入简洁动画样式
   */
  private injectPulseAnimation(): void {
    const animationId = 'wxt-floating-ball-animation';
    if (document.getElementById(animationId)) return;

    const style = document.createElement('style');
    style.id = animationId;
    style.textContent = `
      @keyframes wxt-floating-ball-pulse {
        0%, 100% {
          transform: translateY(-50%) scale(0.9);
        }
        50% {
          transform: translateY(-50%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 校准位置 - 确保位置准确性和边界安全
   */
  private calibratePosition(): void {
    if (!this.ballElement) return;

    // 验证并修正位置
    const correctedPosition = this.validateAndCorrectPosition(
      this.config.position,
    );
    if (correctedPosition !== this.config.position) {
      this.config.position = correctedPosition;
      this.state.currentPosition = correctedPosition;
    }

    // 重新设置位置，确保精确对齐
    requestAnimationFrame(() => {
      if (this.ballElement) {
        this.ballElement.style.top = `${this.config.position}%`;
      }
    });
  }

  /**
   * 验证并修正位置，确保在安全边界内
   */
  private validateAndCorrectPosition(position: number): number {
    // 基本有效性检查
    if (!this.isValidPosition(position)) {
      return 50; // 默认中间位置
    }

    // 边界检测和修正
    const windowHeight = window.innerHeight;
    const ballSize = FLOATING_BALL_STYLES.size;

    // 计算安全边界（百分比）
    const minSafePercent = (ballSize / 2 / windowHeight) * 100;
    const maxSafePercent = ((windowHeight - ballSize / 2) / windowHeight) * 100;

    // 确保在安全边界内
    const safePosition = Math.max(
      Math.max(DRAG_CONFIG.minPosition, minSafePercent),
      Math.min(Math.min(DRAG_CONFIG.maxPosition, maxSafePercent), position),
    );

    return safePosition;
  }

  /**
   * 更新悬浮球样式
   */
  private updateBallStyle(): void {
    if (!this.ballElement) return;

    const { size, right, background, boxShadow, transition, zIndex } =
      FLOATING_BALL_STYLES;

    // 注入动画样式
    this.injectPulseAnimation();

    const styles = `
      position: fixed;
      right: ${right};
      top: ${this.config.position}%;
      width: ${size}px;
      height: ${size}px;
      background: ${background};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: ${boxShadow};
      opacity: ${this.config.opacity};
      z-index: ${zIndex};
      transition: ${transition};
      user-select: none;
      transform: translateY(-50%);
      animation: wxt-floating-ball-pulse 4s ease-in-out infinite;
    `;

    this.ballElement.style.cssText = styles;

    // 校准位置
    this.calibratePosition();
  }

  /**
   * 更新菜单样式
   */
  private updateMenuStyle(): void {
    if (!this.menuContainer) return;

    const ballRect = this.ballElement?.getBoundingClientRect();
    if (!ballRect) return;

    const { itemSize, itemSpacing, zIndex, transition } = MENU_STYLES;

    // 菜单容器基础样式 - 定位到悬浮球正下方
    const menuHeight = MENU_ACTIONS.length * (itemSize + itemSpacing);
    const containerStyles = `
      position: fixed;
      right: ${FLOATING_BALL_STYLES.size / 2 - itemSize / 2 + 10}px;
      top: ${this.config.position}%;
      width: ${itemSize}px;
      height: ${menuHeight}px;
      transform: translateY(${FLOATING_BALL_STYLES.size / 2 + 15}px);
      z-index: ${zIndex};
      pointer-events: ${this.state.isMenuExpanded ? 'auto' : 'none'};
      opacity: ${this.state.isMenuExpanded ? 1 : 0};
      transition: ${transition};
    `;

    this.menuContainer.style.cssText = containerStyles;

    // 更新菜单项位置
    this.updateMenuItemPositions();
  }

  /**
   * 更新菜单项位置
   */
  private updateMenuItemPositions(): void {
    if (!this.menuContainer) return;

    const items = this.menuContainer.querySelectorAll('.wxt-menu-item');
    const { itemSize, itemSpacing, background, boxShadow, transition } =
      MENU_STYLES;

    items.forEach((item, index) => {
      const element = item as HTMLElement;
      // 垂直排列在悬浮球正下方
      const x = 0; // 水平居中
      const y = index * (itemSize + itemSpacing); // 垂直向下排列

      const scale = this.state.isMenuExpanded ? 1 : 0;
      const delay = this.state.isMenuExpanded
        ? index * 50
        : (items.length - index - 1) * 50;

      element.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${itemSize}px;
        height: ${itemSize}px;
        background: ${background};
        backdrop-filter: ${MENU_STYLES.backdropFilter};
        -webkit-backdrop-filter: ${MENU_STYLES.backdropFilter};
        border: ${MENU_STYLES.border};
        border-radius: 50%;
        box-shadow: ${boxShadow};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: scale(${scale});
        transition: ${transition};
        transition-delay: ${delay}ms;
        font-size: 16px;
      `;
    });
  }

  /**
   * 设置悬停效果
   */
  private setupHoverEffects(): void {
    if (!this.ballElement) return;

    const {
      hoverBackground,
      hoverBoxShadow,
      background,
      boxShadow,
      hoverScale,
      activeBackground,
      activeBoxShadow,
    } = FLOATING_BALL_STYLES;

    // 鼠标进入效果
    this.ballElement.addEventListener('mouseenter', () => {
      if (!this.state.isDragging && this.ballElement) {
        this.ballElement.style.background = hoverBackground;
        this.ballElement.style.transform = `translateY(-50%) scale(${hoverScale})`;
        this.ballElement.style.boxShadow = hoverBoxShadow;
      }
    });

    // 鼠标离开效果
    this.ballElement.addEventListener('mouseleave', () => {
      if (!this.state.isDragging && this.ballElement) {
        this.ballElement.style.background = background;
        this.ballElement.style.transform = 'translateY(-50%) scale(1)';
        this.ballElement.style.boxShadow = boxShadow;
      }
    });

    // 点击激活效果
    this.ballElement.addEventListener('mousedown', () => {
      if (this.ballElement) {
        this.ballElement.style.background = activeBackground;
        this.ballElement.style.boxShadow = activeBoxShadow;
      }
    });

    // 点击释放效果
    this.ballElement.addEventListener('mouseup', () => {
      if (!this.state.isDragging && this.ballElement) {
        setTimeout(() => {
          if (this.ballElement) {
            this.ballElement.style.background = hoverBackground;
            this.ballElement.style.boxShadow = hoverBoxShadow;
          }
        }, 150); // 短暂显示激活状态后恢复悬停状态
      }
    });
  }

  /**
   * 设置菜单悬停事件
   */
  private setupMenuHoverEvents(): void {
    if (!this.ballElement || !this.menuContainer) return;

    // 悬浮球悬停时显示菜单
    this.bindEventListener(this.ballElement, 'mouseenter', () => {
      this.showMenuOnHover();
    });

    // 悬浮球离开时隐藏菜单（带延迟）
    this.bindEventListener(this.ballElement, 'mouseleave', () => {
      this.hideMenuOnLeave();
    });

    // 菜单容器悬停时保持显示
    this.bindEventListener(this.menuContainer, 'mouseenter', () => {
      this.showMenuOnHover();
    });

    // 菜单容器离开时隐藏菜单
    this.bindEventListener(this.menuContainer, 'mouseleave', () => {
      this.hideMenuOnLeave();
    });

    // 为触摸设备添加点击切换菜单的能力
    if (this.isTouchDevice) {
      this.bindEventListener(this.ballElement, 'click', (e) => {
        if (!this.state.isDragging) {
          e.preventDefault();
          e.stopPropagation();
          // 在触摸设备上，点击切换菜单的显示/隐藏状态
          if (this.state.isMenuExpanded) {
            this.hideMenuOnLeave();
          } else {
            this.showMenuOnHover();
          }
        }
      });
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.ballElement) return;

    // 悬停效果
    this.setupHoverEffects();

    // 设置菜单悬停事件
    this.setupMenuHoverEvents();

    // 点击事件（加入双击处理和去抖动）
    this.bindEventListener(this.ballElement, 'click', (e) => {
      if (!this.state.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        this.handleClickWithDebounce();
      }
    });

    // 触摸事件处理 - 使用 passive: false 允许我们在需要时阻止默认行为
    // 但仅当真正需要时才阻止默认行为，以确保页面其他区域能正常滚动
    this.bindEventListener(
      this.ballElement,
      'touchstart',
      this.handleTouchStart.bind(this),
      { passive: false },
    );
    this.bindEventListener(
      document,
      'touchmove',
      this.handleTouchMove.bind(this),
      { passive: false },
    );
    this.bindEventListener(
      document,
      'touchend',
      this.handleTouchEnd.bind(this),
      { passive: false },
    );

    // 同时注册鼠标事件作为后备（但加入设备检测）
    this.bindEventListener(
      this.ballElement,
      'mousedown',
      this.handleMouseDown.bind(this),
    );
    this.bindEventListener(
      document,
      'mousemove',
      this.handleMouseMove.bind(this),
    );
    this.bindEventListener(document, 'mouseup', this.handleMouseUp.bind(this));
  }

  /**
   * 带防抖动的点击处理
   */
  private handleClickWithDebounce(): void {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastClickTime;

    // 检测双击（300ms内的第二次点击）
    if (timeDiff < 300) {
      // 双击，取消之前的定时器，不执行翻译
      if (this.clickDebounceTimer) {
        clearTimeout(this.clickDebounceTimer);
        this.clickDebounceTimer = null;
      }

      if (this.menuHoverTimer) {
        clearTimeout(this.menuHoverTimer);
        this.menuHoverTimer = null;
      }
      return;
    }

    this.lastClickTime = currentTime;

    // 清除之前的定时器
    if (this.clickDebounceTimer) {
      clearTimeout(this.clickDebounceTimer);
    }

    // 设置新的定时器，100ms后执行翻译（防止快速点击）
    this.clickDebounceTimer = window.setTimeout(() => {
      this.handleTranslate();
      this.clickDebounceTimer = null;
    }, 100);
  }

  /**
   * 处理翻译
   */
  private handleTranslate(): void {
    if (this.onTranslateCallback && this.ballElement) {
      this.onTranslateCallback();

      // 显示翻译动画
      const { activeBackground, background } = FLOATING_BALL_STYLES;
      this.ballElement.style.background = activeBackground;

      setTimeout(() => {
        if (this.ballElement) {
          this.ballElement.style.background = background;
        }
      }, 1000);
    }
  }

  /**
   * 鼠标按下处理（增强事件控制）
   */
  private handleMouseDown(e: MouseEvent): void {
    // 防止在触摸设备上重复处理
    if (this.isTouchDevice && e.target && 'ontouchstart' in e.target) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.state.isDragging = false;
    this.dragStartY = e.clientY;

    // 记录当前实际位置（像素值）
    if (this.ballElement) {
      const rect = this.ballElement.getBoundingClientRect();
      this.ballStartY = rect.top + rect.height / 2; // 球心的实际Y坐标
    }

    // 禁用过渡动画，防止拖拽时的干扰
    if (this.ballElement) {
      this.ballElement.style.transition = 'none';
    }
  }

  /**
   * 鼠标移动处理（增强事件过滤，防止与文本选择冲突）
   */
  private handleMouseMove(e: MouseEvent): void {
    // 关键修复：只有在悬浮球被明确按下时才处理移动事件
    if (
      !this.ballElement ||
      (!this.state.isDragging && this.dragStartY === 0)
    ) {
      return;
    }

    // 检查鼠标按钮状态（必须是左键按下）
    if (e.buttons !== 1) {
      return;
    }

    // 防止文本选择冲突：检查是否有活动的文本选择
    const selection = window.getSelection();
    if (
      selection &&
      selection.toString().length > 0 &&
      !this.state.isDragging
    ) {
      // 如果存在文本选择且还未开始拖拽，则忽略此事件
      return;
    }

    // 验证事件来源：确保与悬浮球的初始交互相关
    if (this.dragStartY === 0) {
      // 没有有效的拖拽起始点，忽略事件
      return;
    }

    // 计算移动距离，如果超过阈值则开始拖拽
    const deltaY = Math.abs(e.clientY - this.dragStartY);
    if (deltaY > DRAG_CONFIG.threshold) {
      this.state.isDragging = true;
    }

    // 如果正在拖拽，则更新位置
    if (this.state.isDragging) {
      e.preventDefault();
      e.stopPropagation();

      // 修复坐标系问题：确保位置计算基于视口而非页面
      const currentY = e.clientY; // clientY已经是相对于视口的坐标
      const windowHeight = window.innerHeight;
      const ballSize = FLOATING_BALL_STYLES.size;

      // 计算新的球心位置（视口坐标系）
      const moveY = currentY - this.dragStartY;
      const newPixelY = this.ballStartY + moveY;

      // 确保球不会超出可视区域边界
      const minPixelY = ballSize / 2;
      const maxPixelY = windowHeight - ballSize / 2;
      const clampedPixelY = Math.max(minPixelY, Math.min(maxPixelY, newPixelY));

      // 转换为百分比（基于球心位置，视口高度）
      const newPositionPercent = (clampedPixelY / windowHeight) * 100;

      // 再次限制在配置范围内
      const finalPosition = Math.max(
        DRAG_CONFIG.minPosition,
        Math.min(DRAG_CONFIG.maxPosition, newPositionPercent),
      );

      // 验证位置有效性
      if (this.isValidPosition(finalPosition)) {
        this.config.position = finalPosition;
        this.state.currentPosition = finalPosition;
        this.ballElement.style.top = `${finalPosition}%`;
      }
    }
  }

  /**
   * 验证位置是否有效
   */
  private isValidPosition(position: number): boolean {
    return (
      typeof position === 'number' &&
      !isNaN(position) &&
      position >= 0 &&
      position <= 100
    );
  }

  /**
   * 鼠标释放处理（优化状态管理，防止文本选择冲突）
   */
  private handleMouseUp(e: MouseEvent): void {
    // 防止在触摸设备上重复处理
    if (this.isTouchDevice && e.target && 'ontouchstart' in e.target) {
      return;
    }

    // 只有在有有效拖拽起始点时才处理释放事件
    if (this.dragStartY === 0) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // 恢复过渡动画
    if (this.ballElement) {
      this.ballElement.style.transition = FLOATING_BALL_STYLES.transition;
    }

    const wasDragging = this.state.isDragging;

    if (wasDragging) {
      // 最终校准位置
      this.calibratePosition();

      // 防抖保存位置到存储
      this.debouncedSavePosition();
    }

    // 重置所有拖拽相关状态
    this.state.isDragging = false;
    this.dragStartY = 0; // 关键：重置拖拽起始点
    this.ballStartY = 0;

    // 如果刚完成拖拽，短暂延迟后允许点击事件
    if (wasDragging) {
      // 设置标记防止立即触发点击
      this.lastClickTime = Date.now();
    }
  }

  /**
   * 触摸开始处理（独立实现，避免与鼠标事件冲突）
   */
  private handleTouchStart(e: TouchEvent): void {
    // 确保是触摸设备并且只有一个触摸点
    if (e.touches.length !== 1) return;

    // 检查触摸点是否在悬浮球上
    if (this.ballElement) {
      const touch = e.touches[0];
      const ballRect = this.ballElement.getBoundingClientRect();

      // 判断触摸点是否在悬浮球范围内
      const isTouchOnBall =
        touch.clientX >= ballRect.left &&
        touch.clientX <= ballRect.right &&
        touch.clientY >= ballRect.top &&
        touch.clientY <= ballRect.bottom;

      // 只有当触摸点确实在悬浮球上时，才处理触摸事件
      if (isTouchOnBall) {
        // 阻止默认行为，但仅在悬浮球范围内
        e.preventDefault();
        e.stopPropagation();

        // 记录起始位置，用于判断是点击还是拖动
        this.state.isDragging = false;
        this.dragStartY = touch.clientY;
        this.lastClickTime = Date.now(); // 更新点击时间，用于检测点击事件

        // 记录当前实际位置（像素值）
        const rect = this.ballElement.getBoundingClientRect();
        this.ballStartY = rect.top + rect.height / 2; // 球心的实际Y坐标

        // 添加视觉反馈，表示可拖动状态
        this.ballElement.style.transform = 'translateY(-50%) scale(1.05)';

        // 禁用过渡动画，防止拖拽时的干扰
        this.ballElement.style.transition = 'none';

        // 显示菜单（在触摸设备上，让菜单在点击时显示）
        this.showMenuOnHover();
      } else {
        // 如果触摸点不在悬浮球上，确保重置状态
        this.dragStartY = 0;
        this.ballStartY = 0;
      }
    }
  }

  /**
   * 触摸移动处理（独立实现）
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.ballElement || e.touches.length !== 1) return;

    // 只有当我们确认是在拖动悬浮球时才阻止默认行为
    // 这样可以让页面其他区域正常滚动
    if (this.dragStartY !== 0) {
      const touch = e.touches[0];

      // 如果已经开始拖拽或者移动距离超过阈值，则设置拖拽状态
      const deltaY = Math.abs(touch.clientY - this.dragStartY);
      // 使用更小的阈值，使拖动更灵敏
      const dragThreshold = Math.min(DRAG_CONFIG.threshold, 5);

      if (deltaY > dragThreshold) {
        // 只有确认是悬浮球拖动时才阻止页面默认行为
        e.preventDefault();
        e.stopPropagation();
        this.state.isDragging = true;
      }

      // 一旦开始拖拽，持续更新位置
      // 使用与鼠标事件相同的位置计算逻辑
      const currentY = touch.clientY;
      const windowHeight = window.innerHeight;
      const ballSize = FLOATING_BALL_STYLES.size;

      // 计算新的球心位置（视口坐标系）
      const moveY = currentY - this.dragStartY;
      const newPixelY = this.ballStartY + moveY;

      // 确保球不会超出可视区域边界
      const minPixelY = ballSize / 2;
      const maxPixelY = windowHeight - ballSize / 2;
      const clampedPixelY = Math.max(minPixelY, Math.min(maxPixelY, newPixelY));

      // 转换为百分比
      const newPositionPercent = (clampedPixelY / windowHeight) * 100;

      // 再次限制在配置范围内
      const finalPosition = Math.max(
        DRAG_CONFIG.minPosition,
        Math.min(DRAG_CONFIG.maxPosition, newPositionPercent),
      );

      // 验证位置有效性
      if (this.isValidPosition(finalPosition)) {
        this.config.position = finalPosition;
        this.state.currentPosition = finalPosition;
        this.ballElement.style.top = `${finalPosition}%`;
      }
    }
  }

  /**
   * 触摸结束处理（独立实现）
   */
  private handleTouchEnd(e: TouchEvent): void {
    // 检查是否是悬浮球上的点击/拖动
    const touchOnBall = this.dragStartY !== 0;

    if (touchOnBall) {
      e.preventDefault();
      e.stopPropagation();

      // 恢复过渡动画
      if (this.ballElement) {
        this.ballElement.style.transition = FLOATING_BALL_STYLES.transition;

        // 恢复正常大小
        this.ballElement.style.transform = 'translateY(-50%) scale(1)';
      }

      const wasDragging = this.state.isDragging;

      // 如果确实拖动了悬浮球，保存新位置
      if (wasDragging) {
        // 最终校准位置
        this.calibratePosition();

        // 防抖保存位置到存储
        this.debouncedSavePosition();
      } else {
        // 如果没有拖动（即只是点击），则触发翻译
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastClickTime;

        // 短触摸时间视为点击，触发翻译
        if (timeDiff < 300) {
          // 模拟点击事件
          this.handleTranslate();
        }
      }
    }

    // 无论如何都重置拖拽状态，确保干净的状态机
    this.state.isDragging = false;
    this.dragStartY = 0;
    this.ballStartY = 0;
  }

  /**
   * 防抖保存位置
   */
  private debouncedSavePosition(): void {
    if (this.savePositionTimer) {
      clearTimeout(this.savePositionTimer);
    }

    this.savePositionTimer = window.setTimeout(() => {
      this.savePosition();
    }, 300); // 300ms 防抖
  }

  /**
   * 保存位置到存储
   */
  private async savePosition(): Promise<void> {
    try {
      const { StorageService } = await import('../../core/storage');
      const storageService = StorageService.getInstance();
      const settings = await storageService.getUserSettings();
      settings.floatingBall.position = this.config.position;
      await storageService.saveUserSettings(settings);
    } catch (error) {
      console.error('保存悬浮球位置失败:', error);
    }
  }

  /**
   * 鼠标悬停或触摸时显示菜单
   */
  private showMenuOnHover(): void {
    // 清除隐藏定时器
    if (this.menuHoverTimer) {
      clearTimeout(this.menuHoverTimer);
      this.menuHoverTimer = null;
    }

    // 立即显示菜单
    if (!this.state.isMenuExpanded) {
      this.state.isMenuExpanded = true;

      // 确保菜单位置正确
      this.updateMenuStyle();

      // 只在第一次显示时绑定事件监听器
      if (!this.menuItemsEventsBound) {
        this.bindMenuItemListeners();
        this.menuItemsEventsBound = true;
      }

      // 在触摸设备上，延迟自动关闭菜单
      if (this.isTouchDevice) {
        this.menuHoverTimer = window.setTimeout(() => {
          this.hideMenuOnLeave();
          this.menuHoverTimer = null;
        }, 3000); // 3秒后自动关闭
      }
    }
  }

  /**
   * 鼠标离开时隐藏菜单（带延迟）
   */
  private hideMenuOnLeave(): void {
    // 清除之前的定时器
    if (this.menuHoverTimer) {
      clearTimeout(this.menuHoverTimer);
    }

    // 延迟300ms隐藏菜单，给用户时间移动到菜单上
    this.menuHoverTimer = window.setTimeout(() => {
      if (this.state.isMenuExpanded) {
        this.state.isMenuExpanded = false;
        this.updateMenuStyle();
      }
      this.menuHoverTimer = null;
    }, 300);
  }

  /**
   * 切换菜单展开/收起状态
   */
  private toggleMenu(): void {
    this.state.isMenuExpanded = !this.state.isMenuExpanded;
    this.updateMenuStyle();

    // 添加全局点击监听器以关闭菜单
    if (this.state.isMenuExpanded) {
      this.bindEventListener(
        document,
        'click',
        this.handleDocumentClick.bind(this),
        true,
      );

      // 只在第一次显示时绑定事件监听器
      if (!this.menuItemsEventsBound) {
        this.bindMenuItemListeners();
        this.menuItemsEventsBound = true;
      }
    }
  }

  /**
   * 处理文档点击事件（用于关闭菜单）
   */
  private handleDocumentClick(e: MouseEvent): void {
    if (!this.ballElement || !this.menuContainer) return;

    const target = e.target as HTMLElement;

    // 如果点击的是悬浮球或菜单内部，则不关闭菜单
    if (
      this.ballElement.contains(target) ||
      this.menuContainer.contains(target)
    ) {
      return;
    }

    // 关闭菜单
    if (this.state.isMenuExpanded) {
      this.state.isMenuExpanded = false;
      this.updateMenuStyle();
    }
  }

  /**
   * 处理菜单操作
   */
  private handleMenuAction(action: FloatingBallActionType): void {
    // 清理悬停定时器
    if (this.menuHoverTimer) {
      clearTimeout(this.menuHoverTimer);
      this.menuHoverTimer = null;
    }

    // 先关闭菜单
    this.state.isMenuExpanded = false;
    this.updateMenuStyle();

    switch (action) {
      case 'settings':
        this.openSettings();
        break;

      case 'close':
        this.closeBall();
        break;
      case 'options':
        this.openOptions();
        break;
      default:
        console.warn('未知的菜单操作:', action);
    }
  }

  /**
   * 打开设置页面
   */
  private openSettings(): void {
    try {
      // 使用扩展 API 打开 popup
      browser.runtime.sendMessage({ type: 'open-popup' });
    } catch (error) {
      console.error('打开设置失败:', error);
    }
  }

  /**
   * 打开选项页面
   */
  private openOptions(): void {
    try {
      browser.runtime.sendMessage({ type: 'open-options' });
    } catch (error) {
      console.error('打开选项失败:', error);
    }
  }

  /**
   * 关闭悬浮球
   */
  private closeBall(): void {
    // 清理所有定时器
    if (this.menuHoverTimer) {
      clearTimeout(this.menuHoverTimer);
      this.menuHoverTimer = null;
    }
    if (this.clickDebounceTimer) {
      clearTimeout(this.clickDebounceTimer);
      this.clickDebounceTimer = null;
    }

    // 重置菜单状态
    this.state.isMenuExpanded = false;
    this.menuItemsEventsBound = false;

    // 隐藏元素
    this.state.isVisible = false;
    if (this.ballElement) {
      this.ballElement.style.display = 'none';
    }
    if (this.menuContainer) {
      this.menuContainer.style.display = 'none';
    }
  }

  /**
   * 绑定菜单项事件监听器
   */
  private bindMenuItemListeners(): void {
    if (!this.menuContainer) return;

    const menuItems = this.menuContainer.querySelectorAll('.wxt-menu-item');
    menuItems.forEach((item) => {
      const element = item as HTMLElement;
      const action = element.dataset.action as FloatingBallActionType;

      this.bindEventListener(element, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleMenuAction(action);
      });

      // 添加悬停效果
      this.bindEventListener(element, 'mouseenter', () => {
        element.style.background = MENU_STYLES.hoverBackground;
        element.style.transform = 'scale(1.1)';
        element.style.boxShadow =
          '0 12px 32px rgba(106, 136, 224, 0.3), 0 6px 16px rgba(0, 0, 0, 0.15)';
        element.style.backdropFilter = 'blur(16px) saturate(1.8)';
      });

      this.bindEventListener(element, 'mouseleave', () => {
        element.style.background = MENU_STYLES.background;
        element.style.transform = 'scale(1)';
        element.style.boxShadow = MENU_STYLES.boxShadow;
        element.style.backdropFilter = MENU_STYLES.backdropFilter;
      });
    });
  }

  /**
   * 获取当前状态
   */
  getState(): FloatingBallState {
    return { ...this.state };
  }

  /**
   * 更新翻译状态指示
   *
   * 提供平滑的视觉过渡效果：
   * 1. 悬浮球缩小 (0.1s)
   * 2. 更新图标和提示文本
   * 3. 悬浮球恢复大小 (0.1s)
   *
   * 性能优化：
   * - 使用requestAnimationFrame确保动画流畅
   * - 一次性更新所有需要变更的属性
   */
  updateTranslationStateIndicator(): void {
    if (!this.ballElement) return;

    // 开始缩放动画
    this.startTransitionAnimation();

    // 延迟更新内容，创造平滑的过渡效果
    setTimeout(() => {
      this.updateBallContent();
      this.endTransitionAnimation();
    }, 100);
  }

  /**
   * 开始过渡动画
   * @private
   */
  private startTransitionAnimation(): void {
    if (!this.ballElement) return;

    this.ballElement.style.transition = 'transform 0.2s ease-out';
    this.ballElement.style.transform = 'translateY(-50%) scale(0.8)';
  }

  /**
   * 更新悬浮球内容
   * @private
   */
  private updateBallContent(): void {
    if (!this.ballElement) return;

    // 更新图标 - 使用安全的HTML设置方法
    safeSetInnerHTML(this.ballElement, this.createBallIcon());

    // 更新提示文本
    this.updateTooltipText();
  }

  /**
   * 结束过渡动画
   * @private
   */
  private endTransitionAnimation(): void {
    if (!this.ballElement) return;

    this.ballElement.style.transform = 'translateY(-50%) scale(1)';
  }

  /**
   * 更新提示文本
   * @private
   */
  private updateTooltipText(): void {
    if (!this.ballElement) return;

    // 检查翻译状态
    const hasTranslatedContent =
      document.querySelector('.wxt-translation-term') !== null;
    const isTranslationHidden = document.body.classList.contains(
      'wxt-translation-hidden',
    );

    // 确定提示文本
    let modeText;
    if (!hasTranslatedContent) {
      modeText = '准备翻译';
    } else if (isTranslationHidden) {
      modeText = '原文模式';
    } else {
      modeText = '翻译模式';
    }

    this.ballElement.title = `${modeText}`;
  }

  /**
   * 显示通知消息
   */
  private showNotification(message: string): void {
    // 创建简单的通知提示
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      opacity: 0;
      transition: opacity 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);

    // 3秒后自动消失
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * 销毁悬浮球（完整资源清理）
   */
  destroy(): void {
    // 移除悬浮球元素
    if (this.ballElement) {
      this.ballElement.remove();
      this.ballElement = null;
    }

    // 移除菜单容器
    if (this.menuContainer) {
      this.menuContainer.remove();
      this.menuContainer = null;
    }

    // 清理所有事件监听器
    this.removeAllEventListeners();

    // 清理所有定时器
    if (this.savePositionTimer) {
      clearTimeout(this.savePositionTimer);
      this.savePositionTimer = null;
    }

    if (this.clickDebounceTimer) {
      clearTimeout(this.clickDebounceTimer);
      this.clickDebounceTimer = null;
    }

    if (this.menuHoverTimer) {
      clearTimeout(this.menuHoverTimer);
      this.menuHoverTimer = null;
    }

    // 清理动画样式
    const animationStyle = document.getElementById(
      'wxt-floating-ball-animation',
    );
    if (animationStyle) {
      animationStyle.remove();
    }

    // 重置状态
    this.state = {
      isDragging: false,
      isVisible: false,
      isMenuExpanded: false,
      currentPosition: 50,
    };

    // 重置其他属性
    this.dragStartY = 0;
    this.ballStartY = 0;
    this.lastClickTime = 0;
    this.menuItemsEventsBound = false;
    this.onTranslateCallback = undefined;
  }
}
