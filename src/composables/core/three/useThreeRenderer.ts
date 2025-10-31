import type { Ref } from 'vue';

import type { BaseConfig } from '@/types/common';
import type {
  RendererAPI,
  RendererConfig,
  RendererEventData,
  RendererStats,
} from '@/types/three/renderer';

import { onUnmounted, readonly, ref, shallowRef } from 'vue';

import * as THREE from 'three';

import { useEventBus } from '@/services/events/EventBus';

/** useThreeRenderer 配置选项 */
export interface UseThreeRendererOptions extends BaseConfig {
  /** 是否启用性能监控 */
  enableStats?: boolean;
  /** 渲染器配置 */
  renderer?: Partial<RendererConfig>;
  /** 目标帧率 */
  targetFPS?: number;
}

/**
 * Three.js 渲染器管理 Composable
 *
 * 功能特性：
 * - 渲染器创建和配置管理
 * - 渲染循环控制和性能监控
 * - 自动调整大小和像素比
 * - 截图功能
 * - WebGL 上下文丢失处理
 *
 * @param renderer 已存在的渲染器实例
 * @param options 配置选项
 * @returns RendererAPI 渲染器管理接口
 */
export function useThreeRenderer(
  renderer?: THREE.WebGLRenderer,
  options: UseThreeRendererOptions = {},
): RendererAPI {
  // 渲染器实例
  const rendererRef = shallowRef<null | THREE.WebGLRenderer>(renderer || null);

  // 状态管理
  const isRendering = ref(false);
  const renderTime = ref(0);
  const stats = ref<RendererStats>({
    calls: 0,
    geometries: 0,
    memory: {
      geometries: 0,
      textures: 0,
    },
    programs: 0,
    textures: 0,
    triangles: 0,
  });

  // 渲染循环控制
  let animationId: null | number = null;
  let lastTime = 0;
  const targetFrameTime = 1000 / (options.targetFPS || 60);

  // 事件总线
  const eventBus = useEventBus();

  // 默认配置
  const defaultConfig: RendererConfig = {
    alpha: true,
    antialias: true,
    outputColorSpace: THREE.SRGBColorSpace,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    preserveDrawingBuffer: false,
    shadowMapEnabled: true,
    shadowMapType: THREE.PCFSoftShadowMap,
    toneMapping: THREE.ReinhardToneMapping,
    toneMappingExposure: 2,
  };

  // 合并配置
  const config = { ...defaultConfig, ...options.renderer };

  /**
   * 创建渲染器
   */
  const createRenderer = (canvas?: HTMLCanvasElement): THREE.WebGLRenderer => {
    const newRenderer = new THREE.WebGLRenderer({
      alpha: config.alpha,
      antialias: config.antialias,
      canvas,
      preserveDrawingBuffer: config.preserveDrawingBuffer,
    });

    // 应用配置
    applyConfig(newRenderer, config);

    // 监听上下文丢失事件
    setupContextHandlers(newRenderer);

    return newRenderer;
  };

  /**
   * 应用渲染器配置
   */
  const applyConfig = (
    renderer: THREE.WebGLRenderer,
    cfg: Partial<RendererConfig>,
  ): void => {
    if (cfg.pixelRatio !== undefined) {
      renderer.setPixelRatio(cfg.pixelRatio);
    }

    if (cfg.toneMapping !== undefined) {
      renderer.toneMapping = cfg.toneMapping;
    }

    if (cfg.toneMappingExposure !== undefined) {
      renderer.toneMappingExposure = cfg.toneMappingExposure;
    }

    if (cfg.shadowMapEnabled !== undefined) {
      renderer.shadowMap.enabled = cfg.shadowMapEnabled;
    }

    if (cfg.shadowMapType !== undefined) {
      renderer.shadowMap.type = cfg.shadowMapType;
    }

    if (cfg.outputColorSpace !== undefined) {
      renderer.outputColorSpace = cfg.outputColorSpace;
    }
  };

  /**
   * 设置上下文处理器
   */
  const setupContextHandlers = (renderer: THREE.WebGLRenderer): void => {
    const canvas = renderer.domElement;

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      stopRenderLoop();

      if (options.debug) {
        console.warn('[useThreeRenderer] WebGL context lost');
      }

      eventBus.emit('renderer:contextLost', { renderer });
    });

    canvas.addEventListener('webglcontextrestored', () => {
      if (options.debug) {
        console.warn('[useThreeRenderer] WebGL context restored');
      }

      eventBus.emit('renderer:contextRestored', { renderer });
    });
  };

  /**
   * 更新统计信息
   */
  const updateStats = (renderer: THREE.WebGLRenderer): void => {
    if (!options.enableStats) return;

    const info = renderer.info;
    stats.value = {
      calls: info.render.calls,
      geometries: info.memory.geometries,
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      programs: info.programs?.length || 0,
      textures: info.memory.textures,
      triangles: info.render.triangles,
    };
  };

  /**
   * 渲染单帧
   */
  const render = (scene: THREE.Scene, camera: THREE.Camera): void => {
    if (!rendererRef.value) {
      if (options.debug) {
        console.warn('[useThreeRenderer] Renderer not initialized');
      }
      return;
    }

    const startTime = performance.now();

    // 发送渲染前事件
    const beforeRenderData: RendererEventData['renderer:beforeRender'] = {
      camera,
      renderer: rendererRef.value,
      scene,
    };
    eventBus.emit('renderer:beforeRender', beforeRenderData);

    try {
      // 执行渲染
      rendererRef.value.render(scene, camera);

      // 计算渲染时间
      const endTime = performance.now();
      renderTime.value = endTime - startTime;

      // 更新统计信息
      updateStats(rendererRef.value);

      // 发送渲染后事件
      const afterRenderData: RendererEventData['renderer:afterRender'] = {
        renderer: rendererRef.value,
        renderTime: renderTime.value,
        stats: stats.value,
      };
      eventBus.emit('renderer:afterRender', afterRenderData);
    } catch (error) {
      console.error('[useThreeRenderer] Render error:', error);
    }
  };

  /**
   * 开始渲染循环
   */
  const startRenderLoop = (): void => {
    if (isRendering.value || !rendererRef.value) return;

    isRendering.value = true;
    lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!isRendering.value) return;

      const deltaTime = currentTime - lastTime;

      // 帧率控制
      if (deltaTime >= targetFrameTime) {
        // 这里需要外部提供场景和相机
        // 实际使用时会通过参数或事件系统获取
        lastTime = currentTime - (deltaTime % targetFrameTime);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    if (options.debug) {
      console.warn('[useThreeRenderer] Render loop started');
    }
  };

  /**
   * 停止渲染循环
   */
  const stopRenderLoop = (): void => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    isRendering.value = false;

    if (options.debug) {
      console.warn('[useThreeRenderer] Render loop stopped');
    }
  };

  /**
   * 调整大小
   */
  const resize = (width: number, height: number): void => {
    if (!rendererRef.value) return;

    rendererRef.value.setSize(width, height);

    const eventData: RendererEventData['renderer:resize'] = {
      height,
      pixelRatio: rendererRef.value.getPixelRatio(),
      width,
    };
    eventBus.emit('renderer:resize', eventData);

    if (options.debug) {
      console.warn(`[useThreeRenderer] Resized to ${width}x${height}`);
    }
  };

  /**
   * 更新配置
   */
  const updateConfig = (newConfig: Partial<RendererConfig>): void => {
    if (!rendererRef.value) return;

    Object.assign(config, newConfig);
    applyConfig(rendererRef.value, newConfig);

    if (options.debug) {
      console.warn('[useThreeRenderer] Configuration updated', newConfig);
    }
  };

  /**
   * 截图
   */
  const screenshot = (format: 'jpeg' | 'png' = 'png', quality = 1): string => {
    if (!rendererRef.value) {
      throw new Error('Renderer not initialized');
    }

    return rendererRef.value.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality,
    );
  };

  /**
   * 清理资源
   */
  const dispose = (): void => {
    stopRenderLoop();

    if (rendererRef.value) {
      rendererRef.value.dispose();
      rendererRef.value = null;
    }

    // 重置状态
    isRendering.value = false;
    renderTime.value = 0;
    stats.value = {
      calls: 0,
      geometries: 0,
      memory: {
        geometries: 0,
        textures: 0,
      },
      programs: 0,
      textures: 0,
      triangles: 0,
    };

    if (options.debug) {
      console.warn('[useThreeRenderer] Resources disposed');
    }
  };

  // 如果没有提供渲染器，则创建一个新的
  if (rendererRef.value) {
    // 如果提供了渲染器，应用配置
    applyConfig(rendererRef.value, config);
    setupContextHandlers(rendererRef.value);
  } else {
    rendererRef.value = createRenderer();
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    dispose();
  });

  return {
    dispose,
    isRendering: readonly(isRendering),
    render,
    // 状态 (只读)
    renderer: readonly(rendererRef) as Readonly<
      Ref<null | THREE.WebGLRenderer>
    >,

    renderTime: readonly(renderTime),
    resize,
    screenshot,
    // 方法
    startRenderLoop,
    stats: readonly(stats),
    stopRenderLoop,
    updateConfig,
  };
}
