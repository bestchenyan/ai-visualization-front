import type { Ref } from 'vue';

/** 通用事件回调函数 */
export type EventCallback<T = any> = (data: T) => void;

/** 事件监听器选项 */
export interface EventListenerOptions {
  /** 是否只执行一次 */
  once?: boolean;
  /** 优先级 */
  priority?: number;
}

/** 事件总线接口 */
export interface EventBusAPI {
  /** 移除所有事件监听 */
  clear: () => void;
  /** 发送事件 */
  emit: <K extends string>(event: K, data?: any) => void;
  /** 获取事件监听器数量 */
  getListenerCount: (event?: string) => number;
  /** 移除事件监听 */
  off: <K extends string>(event: K, callback?: EventCallback) => void;
  /** 监听事件 */
  on: <K extends string>(
    event: K,
    callback: EventCallback,
    options?: EventListenerOptions,
  ) => () => void;
  /** 监听一次事件 */
  once: <K extends string>(event: K, callback: EventCallback) => () => void;
}

/** 可配置选项基类 */
export interface BaseConfig {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义标识符 */
  id?: string;
}

/** 可销毁的资源接口 */
export interface Disposable {
  dispose: () => void;
}

/** 可初始化的组件接口 */
export interface Initializable<T = any> {
  init: (config?: T) => Promise<void> | void;
  isInitialized: Ref<boolean>;
}

/** 错误处理接口 */
export interface ErrorHandler {
  clearError: () => void;
  error: Ref<Error | null>;
}

/** 加载状态接口 */
export interface LoadingState {
  loading: Ref<boolean>;
  progress: Ref<number>;
}
