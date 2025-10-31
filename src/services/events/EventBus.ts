import type {
  EventBusAPI,
  EventCallback,
  EventListenerOptions,
} from '@/types/common';

/** 事件监听器信息 */
interface EventListener {
  callback: EventCallback;
  once: boolean;
  priority: number;
}

/**
 * 事件总线服务
 * 提供组件间的解耦通信机制
 */
class EventBus implements EventBusAPI {
  private debug: boolean = false;
  private listeners: Map<string, EventListener[]> = new Map();

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * 移除所有事件监听
   */
  clear(): void {
    if (this.debug) {
      console.warn('[EventBus] Clear all listeners');
    }
    this.listeners.clear();
  }

  /**
   * 发送事件
   */
  emit<K extends string>(event: K, data?: any): void {
    if (this.debug) {
      console.warn(`[EventBus] Emit: ${event}`, data);
    }

    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      // 只对非渲染事件显示警告，避免渲染循环中的噪音
      if (
        this.debug &&
        !event.includes('render') &&
        !event.includes('update')
      ) {
        console.warn(`[EventBus] No listeners for event: ${event}`);
      }
      return;
    }

    // 按优先级排序执行
    const sortedListeners = [...eventListeners].toSorted(
      (a, b) => b.priority - a.priority,
    );

    // 执行监听器，收集需要移除的一次性监听器
    const toRemove: EventListener[] = [];

    sortedListeners.forEach((listener) => {
      try {
        listener.callback(data);
        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        console.error(
          `[EventBus] Error in listener for event ${event}:`,
          error,
        );
      }
    });

    // 移除一次性监听器
    if (toRemove.length > 0) {
      const remainingListeners = eventListeners.filter(
        (listener) => !toRemove.includes(listener),
      );
      if (remainingListeners.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, remainingListeners);
      }
    }
  }

  /**
   * 获取所有事件名称
   */
  getEventNames(): string[] {
    return [...this.listeners.keys()];
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.length ?? 0;
    }

    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * 移除事件监听
   */
  off<K extends string>(event: K, callback?: EventCallback): void {
    if (this.debug) {
      console.warn(`[EventBus] Remove listener for: ${event}`);
    }

    if (!this.listeners.has(event)) {
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    if (!callback) {
      // 移除该事件的所有监听器
      this.listeners.delete(event);
      return;
    }

    // 移除指定的监听器
    const filteredListeners = eventListeners.filter(
      (listener) => listener.callback !== callback,
    );

    if (filteredListeners.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filteredListeners);
    }
  }

  /**
   * 监听事件
   */
  on<K extends string>(
    event: K,
    callback: EventCallback,
    options: EventListenerOptions = {},
  ): () => void {
    if (this.debug) {
      console.warn(`[EventBus] Add listener for: ${event}`);
    }

    const listener: EventListener = {
      callback,
      once: options.once ?? false,
      priority: options.priority ?? 0,
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)?.push(listener);

    // 返回取消监听的函数
    return () => this.off(event, callback);
  }

  /**
   * 监听一次事件
   */
  once<K extends string>(event: K, callback: EventCallback): () => void {
    return this.on(event, callback, { once: true });
  }

  /**
   * 启用/禁用调试模式
   */
  setDebug(debug: boolean): void {
    this.debug = debug;
  }
}

// 创建全局事件总线实例
const globalEventBus = new EventBus(import.meta.env.DEV);

/**
 * 使用事件总线的 Composable
 */
export function useEventBus(): EventBusAPI {
  return globalEventBus;
}

/**
 * 创建独立的事件总线实例
 */
export function createEventBus(debug = false): EventBusAPI {
  return new EventBus(debug);
}

export { EventBus };
export type { EventBusAPI, EventCallback, EventListenerOptions };
