import type { Ref } from 'vue';

import type { BaseConfig } from '@/types/common';
import type {
  SceneAPI,
  SceneConfig,
  SceneEventData,
} from '@/types/three/scene';

import { onUnmounted, readonly, ref, shallowRef } from 'vue';

import * as THREE from 'three';

import { useEventBus } from '@/services/events/EventBus';

/** useThreeScene 配置选项 */
export interface UseThreeSceneOptions extends BaseConfig {
  /** 是否自动调整大小 */
  autoResize?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitor?: boolean;
  /** 场景配置 */
  scene?: Partial<SceneConfig>;
}

/**
 * Three.js 场景管理 Composable
 *
 * 功能特性：
 * - 场景、渲染器、相机的创建和管理
 * - 自动资源清理和内存管理
 * - 响应式尺寸调整
 * - 事件驱动的组件通信
 * - 性能优化（shallowRef）
 * - 完整的错误处理
 *
 * @param options 配置选项
 * @returns SceneAPI 场景管理接口
 */
export function useThreeScene(options: UseThreeSceneOptions = {}): SceneAPI {
  // 使用 shallowRef 避免 Three.js 对象的深度响应式监听，提升性能
  const scene = shallowRef<null | THREE.Scene>(null);
  const renderer = shallowRef<null | THREE.WebGLRenderer>(null);
  const camera = shallowRef<null | THREE.PerspectiveCamera>(null);

  // 状态管理
  const isInitialized = ref(false);
  const error = ref<Error | null>(null);
  const container = shallowRef<HTMLElement | null>(null);

  // 事件总线
  const eventBus = useEventBus();

  // 默认配置
  const defaultConfig: SceneConfig = {
    backgroundBlurriness: 0,
    backgroundColor: 0x00_00_00,
    backgroundIntensity: 1,
    cameraPosition: { x: 0, y: 2, z: 6 },
    environment: null,
    far: 1000,
    fog: null,
    fov: 75,
    near: 0.1,
    rendererOptions: {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    },
  };

  // 合并配置
  const config = { ...defaultConfig, ...options.scene };

  /**
   * 清除错误状态
   */
  const clearError = () => {
    error.value = null;
  };

  /**
   * 检查 WebGL 支持
   */
  const checkWebGLSupport = (): boolean => {
    try {
      const canvas = document.createElement('canvas');
      const context =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!context;
    } catch {
      return false;
    }
  };

  /**
   * 初始化场景
   */
  const initScene = (containerElement: HTMLElement): void => {
    try {
      clearError();

      if (!containerElement) {
        throw new Error('Container element is required');
      }

      if (!checkWebGLSupport()) {
        throw new Error('WebGL is not supported in this browser');
      }

      container.value = containerElement;

      // 创建场景
      scene.value = new THREE.Scene();
      scene.value.background = new THREE.Color(config.backgroundColor);

      if (config.backgroundBlurriness > 0) {
        scene.value.backgroundBlurriness = config.backgroundBlurriness;
      }

      if (config.backgroundIntensity !== 1) {
        scene.value.backgroundIntensity = config.backgroundIntensity;
      }

      if (config.environment) {
        scene.value.environment = config.environment;
      }

      if (config.fog) {
        scene.value.fog = config.fog;
      }

      // 创建渲染器
      renderer.value = new THREE.WebGLRenderer({
        alpha: config.rendererOptions.alpha ?? true,
        antialias: config.rendererOptions.antialias ?? true,
        preserveDrawingBuffer:
          config.rendererOptions.preserveDrawingBuffer ?? true,
        ...config.rendererOptions,
      });

      // 渲染器配置
      renderer.value.setSize(
        containerElement.clientWidth,
        containerElement.clientHeight,
      );
      renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比提升性能
      renderer.value.shadowMap.enabled = true;
      renderer.value.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.value.toneMapping = THREE.ReinhardToneMapping;
      renderer.value.toneMappingExposure = 2;
      renderer.value.outputColorSpace = THREE.SRGBColorSpace;

      // 将渲染器添加到容器
      containerElement.append(renderer.value.domElement);

      // 创建相机
      const aspect =
        containerElement.clientWidth / containerElement.clientHeight;
      camera.value = new THREE.PerspectiveCamera(
        config.fov,
        aspect,
        config.near,
        config.far,
      );

      // 设置相机位置
      const pos = config.cameraPosition;
      camera.value.position.set(pos.x ?? 0, pos.y ?? 2, pos.z ?? 6);

      // 标记为已初始化
      isInitialized.value = true;

      // 发送初始化完成事件
      const eventData: SceneEventData['scene:initialized'] = {
        camera: camera.value,
        renderer: renderer.value,
        scene: scene.value,
      };
      eventBus.emit('scene:initialized', eventData);

      if (options.debug) {
        console.warn('[useThreeScene] Scene initialized successfully', {
          camera: camera.value,
          renderer: renderer.value,
          scene: scene.value,
        });
      }

      // 自动调整大小
      if (options.autoResize !== false) {
        setupAutoResize();
      }
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;

      console.error('[useThreeScene] Failed to initialize scene:', errorObj);

      const eventData: SceneEventData['scene:error'] = { error: errorObj };
      eventBus.emit('scene:error', eventData);
    }
  };

  /**
   * 渲染场景
   */
  const render = (): void => {
    if (!scene.value || !camera.value || !renderer.value) {
      if (options.debug) {
        console.warn('[useThreeScene] Cannot render: scene not initialized');
      }
      return;
    }

    try {
      renderer.value.render(scene.value, camera.value);
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;
      console.error('[useThreeScene] Render error:', errorObj);

      const eventData: SceneEventData['scene:error'] = { error: errorObj };
      eventBus.emit('scene:error', eventData);
    }
  };

  /**
   * 调整大小
   */
  const resize = (width: number, height: number): void => {
    if (!camera.value || !renderer.value) {
      if (options.debug) {
        console.warn('[useThreeScene] Cannot resize: scene not initialized');
      }
      return;
    }

    try {
      // 更新相机宽高比
      camera.value.aspect = width / height;
      camera.value.updateProjectionMatrix();

      // 更新渲染器大小
      renderer.value.setSize(width, height);

      if (options.debug) {
        console.warn(`[useThreeScene] Resized to ${width}x${height}`);
      }

      // 发送尺寸调整事件
      const eventData: SceneEventData['scene:resized'] = { height, width };
      eventBus.emit('scene:resized', eventData);
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;
      console.error('[useThreeScene] Resize error:', errorObj);

      const eventData: SceneEventData['scene:error'] = { error: errorObj };
      eventBus.emit('scene:error', eventData);
    }
  };

  /**
   * 添加对象到场景
   */
  const add = (object: THREE.Object3D): void => {
    if (!scene.value) {
      if (options.debug) {
        console.warn(
          '[useThreeScene] Cannot add object: scene not initialized',
        );
      }
      return;
    }

    scene.value.add(object);

    if (options.debug) {
      console.warn('[useThreeScene] Object added to scene', object);
    }

    // 发送对象添加事件
    const eventData: SceneEventData['scene:objectAdded'] = { object };
    eventBus.emit('scene:objectAdded', eventData);
  };

  /**
   * 从场景移除对象
   */
  const remove = (object: THREE.Object3D): void => {
    if (!scene.value) {
      if (options.debug) {
        console.warn(
          '[useThreeScene] Cannot remove object: scene not initialized',
        );
      }
      return;
    }

    scene.value.remove(object);

    if (options.debug) {
      console.warn('[useThreeScene] Object removed from scene', object);
    }

    // 发送对象移除事件
    const eventData: SceneEventData['scene:objectRemoved'] = { object };
    eventBus.emit('scene:objectRemoved', eventData);
  };

  /**
   * 清空场景
   */
  const clear = (): void => {
    if (!scene.value) {
      if (options.debug) {
        console.warn('[useThreeScene] Cannot clear: scene not initialized');
      }
      return;
    }

    // 清理场景中的所有对象
    const objectsToRemove = [...scene.value.children];
    objectsToRemove.forEach((object) => {
      scene.value?.remove(object);

      // 递归清理几何体和材质
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });

    if (options.debug) {
      console.warn('[useThreeScene] Scene cleared');
    }

    // 发送场景清空事件
    eventBus.emit('scene:cleared', {});
  };

  /**
   * 清理资源
   */
  const dispose = (): void => {
    try {
      if (options.debug) {
        console.warn('[useThreeScene] Disposing scene resources');
      }

      // 清理渲染器
      if (renderer.value) {
        renderer.value.dispose();
        renderer.value.domElement.remove();
        renderer.value = null;
      }

      // 清理场景
      if (scene.value) {
        clear(); // 先清理场景对象
        scene.value = null;
      }

      // 清理相机
      camera.value = null;
      container.value = null;

      // 重置状态
      isInitialized.value = false;
      clearError();

      // 发送资源清理事件
      eventBus.emit('scene:disposed', {});

      if (options.debug) {
        console.warn('[useThreeScene] Resources disposed successfully');
      }
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;
      console.error('[useThreeScene] Dispose error:', errorObj);

      const eventData: SceneEventData['scene:error'] = { error: errorObj };
      eventBus.emit('scene:error', eventData);
    }
  };

  /**
   * 设置自动调整大小
   */
  const setupAutoResize = (): void => {
    if (!container.value) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height, width } = entry.contentRect;
        resize(width, height);
      }
    });

    resizeObserver.observe(container.value);

    // 组件卸载时清理观察器
    onUnmounted(() => {
      resizeObserver.disconnect();
    });
  };

  // 组件卸载时自动清理资源
  onUnmounted(() => {
    dispose();
  });

  // 返回 API 接口
  return {
    add,
    camera: readonly(camera) as Readonly<Ref<null | THREE.PerspectiveCamera>>,
    clear,
    dispose,
    error: readonly(error),

    // 方法
    initScene,
    isInitialized: readonly(isInitialized),
    remove,
    render,
    renderer: readonly(renderer) as Readonly<Ref<null | THREE.WebGLRenderer>>,
    resize,
    // 状态 (只读)
    scene: readonly(scene) as Readonly<Ref<null | THREE.Scene>>,
  };
}
