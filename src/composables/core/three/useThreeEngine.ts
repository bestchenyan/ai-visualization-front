import type { InjectionKey, Ref } from 'vue';

import type { BaseConfig } from '@/types/common';
import type { PerspectiveCameraConfig } from '@/types/three/camera';
import type { OrbitControlsConfig } from '@/types/three/controls';
import type { RendererConfig } from '@/types/three/renderer';
import type { SceneConfig } from '@/types/three/scene';

import { inject, onUnmounted, provide, readonly, ref, shallowRef } from 'vue';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { useEventBus } from '@/services/events/EventBus';

/** Three.js 引擎配置 */
export interface ThreeEngineConfig extends BaseConfig {
  /** 是否自动开始渲染循环 */
  autoRender?: boolean;
  /** 是否自动调整大小 */
  autoResize?: boolean;
  /** 相机配置 */
  camera?: Partial<PerspectiveCameraConfig>;
  /** 控制器配置 */
  controls?: Partial<OrbitControlsConfig>;
  /** 渲染器配置 */
  renderer?: Partial<RendererConfig>;
  /** 场景配置 */
  scene?: Partial<SceneConfig>;
}

/** Three.js 引擎上下文 */
export interface ThreeEngineContext {
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}

/** Three.js 引擎 API */
export interface ThreeEngineAPI {
  // 场景管理
  add: (object: THREE.Object3D) => void;
  camera: Readonly<Ref<null | THREE.PerspectiveCamera>>;
  clear: () => void;
  clock: Readonly<Ref<THREE.Clock>>;
  controls: Readonly<Ref<null | OrbitControls>>;

  // 资源管理
  dispose: () => void;
  error: Readonly<Ref<Error | null>>;
  getControlsConfig: () => null | Partial<OrbitControlsConfig>;
  getIntersection: (mouse: THREE.Vector2) => null | THREE.Intersection;

  // 核心方法
  initialize: (container: HTMLElement) => Promise<void>;
  // 状态
  isInitialized: Readonly<Ref<boolean>>;
  isRendering: Readonly<Ref<boolean>>;
  remove: (object: THREE.Object3D) => void;
  render: () => void;

  renderer: Readonly<Ref<null | THREE.WebGLRenderer>>;
  resize: (width: number, height: number) => void;
  // 核心实例 (只读)
  scene: Readonly<Ref<null | THREE.Scene>>;

  // 工具方法
  screenshot: (format?: 'jpeg' | 'png', quality?: number) => string;
  // 相机控制
  setAutoRotate: (enabled: boolean) => void;
  setAutoRotateSpeed: (speed: number) => void;
  setCameraPosition: (position: THREE.Vector3Like, animate?: boolean) => void;

  setCameraTarget: (target: THREE.Vector3Like) => void;
  setControlsEnabled: (enabled: boolean) => void;
  setControlsProperty: <K extends keyof OrbitControls>(
    key: K,
    value: OrbitControls[K],
  ) => void;
  startRenderLoop: () => void;

  stopRenderLoop: () => void;
}

/**
 * Three.js 引擎统一管理 Composable
 *
 * 这是一个统一的 Three.js 引擎管理器，集成了场景、渲染器、相机和控制器的创建和管理。
 * 避免了多个 Composables 之间的状态同步问题，提供了一个完整的 3D 引擎解决方案。
 *
 * 特性：
 * - 统一的实例管理，避免重复创建
 * - 自动的依赖关系处理
 * - 完整的生命周期管理
 * - 事件驱动的状态更新
 * - Provide/Inject 模式支持
 *
 * @param config 引擎配置
 * @returns ThreeEngineAPI 引擎管理接口
 */
export function useThreeEngine(config: ThreeEngineConfig = {}): ThreeEngineAPI {
  // 核心实例
  const scene = shallowRef<null | THREE.Scene>(null);
  const renderer = shallowRef<null | THREE.WebGLRenderer>(null);
  const camera = shallowRef<null | THREE.PerspectiveCamera>(null);
  const controls = shallowRef<null | OrbitControls>(null);
  const clock = shallowRef(new THREE.Clock());

  // 状态管理
  const isInitialized = ref(false);
  const isRendering = ref(false);
  const error = ref<Error | null>(null);

  // 内部状态
  const container = shallowRef<HTMLElement | null>(null);
  let animationId: null | number = null;
  let resizeObserver: null | ResizeObserver = null;
  const raycaster = new THREE.Raycaster();

  // 事件总线
  const eventBus = useEventBus();

  // 默认配置
  const defaultConfig = {
    camera: {
      fov: 75,
      position: { x: 5, y: 5, z: 5 },
      target: { x: 0, y: 0, z: 0 },
    },
    controls: {
      autoRotate: false,
      dampingFactor: 0.05,
      enableDamping: true,
    },
    renderer: {
      alpha: true,
      antialias: true,
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap,
      toneMapping: THREE.ReinhardToneMapping,
      toneMappingExposure: 1.5,
    },
    scene: {
      backgroundColor: 0x22_22_22,
      cameraPosition: { x: 5, y: 5, z: 5 },
      far: 1000,
      fov: 75,
      near: 0.1,
    },
  };

  // 合并配置
  const finalConfig = {
    camera: { ...defaultConfig.camera, ...config.camera },
    controls: { ...defaultConfig.controls, ...config.controls },
    renderer: { ...defaultConfig.renderer, ...config.renderer },
    scene: { ...defaultConfig.scene, ...config.scene },
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
   * 初始化引擎
   */
  const initialize = async (containerElement: HTMLElement): Promise<void> => {
    try {
      error.value = null;

      if (!containerElement) {
        throw new Error('Container element is required');
      }

      if (!checkWebGLSupport()) {
        throw new Error('WebGL is not supported in this browser');
      }

      container.value = containerElement;

      // 1. 创建场景
      scene.value = new THREE.Scene();
      scene.value.background = new THREE.Color(
        finalConfig.scene.backgroundColor,
      );

      // 2. 创建渲染器
      renderer.value = new THREE.WebGLRenderer({
        alpha: finalConfig.renderer.alpha,
        antialias: finalConfig.renderer.antialias,
      });

      renderer.value.setSize(
        containerElement.clientWidth,
        containerElement.clientHeight,
      );
      renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.value.shadowMap.enabled = finalConfig.renderer.shadowMapEnabled;
      renderer.value.shadowMap.type = finalConfig.renderer.shadowMapType;
      renderer.value.toneMapping = finalConfig.renderer.toneMapping;
      renderer.value.toneMappingExposure =
        finalConfig.renderer.toneMappingExposure;
      renderer.value.outputColorSpace = THREE.SRGBColorSpace;

      containerElement.append(renderer.value.domElement);

      // 3. 创建相机
      const aspect =
        containerElement.clientWidth / containerElement.clientHeight;
      camera.value = new THREE.PerspectiveCamera(
        finalConfig.camera.fov,
        aspect,
        finalConfig.scene.near,
        finalConfig.scene.far,
      );

      const pos = finalConfig.camera.position;
      camera.value.position.set(pos.x ?? 5, pos.y ?? 5, pos.z ?? 5);

      const target = finalConfig.camera.target;
      camera.value.lookAt(target.x ?? 0, target.y ?? 0, target.z ?? 0);

      // 4. 创建控制器
      controls.value = new OrbitControls(
        camera.value,
        renderer.value.domElement,
      );
      controls.value.enableDamping = finalConfig.controls.enableDamping;
      controls.value.dampingFactor = finalConfig.controls.dampingFactor;
      controls.value.autoRotate = finalConfig.controls.autoRotate;
      controls.value.target.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
      controls.value.update();

      // 5. 设置基础光照
      await setupBasicLighting();

      // 6. 设置自动调整大小
      if (config.autoResize !== false) {
        setupAutoResize();
      }

      isInitialized.value = true;

      // 7. 自动开始渲染
      if (config.autoRender !== false) {
        startRenderLoop();
      }

      // 8. 提供上下文给子组件
      const engineContext: ThreeEngineContext = {
        camera: camera.value,
        clock: clock.value,
        controls: controls.value,
        renderer: renderer.value,
        scene: scene.value,
      };
      provide('threeEngine', engineContext);

      // 发送初始化完成事件
      eventBus.emit('engine:initialized', engineContext);

      if (config.debug) {
        console.warn('[useThreeEngine] Engine initialized successfully');
      }
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;
      console.error('[useThreeEngine] Initialization failed:', errorObj);
      eventBus.emit('engine:error', { error: errorObj });
    }
  };

  /**
   * 设置基础光照
   */
  const setupBasicLighting = async (): Promise<void> => {
    if (!scene.value) return;

    // 环境光
    const ambientLight = new THREE.AmbientLight(0x40_40_40, 0.6);
    scene.value.add(ambientLight);

    // 主光源
    const directionalLight = new THREE.DirectionalLight(0xff_ff_ff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;

    // 阴影配置
    directionalLight.shadow.mapSize.setScalar(2048);
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;

    scene.value.add(directionalLight);

    // 补光
    const fillLight = new THREE.DirectionalLight(0x80_c8_ff, 0.3);
    fillLight.position.set(-5, 0, -5);
    scene.value.add(fillLight);
  };

  /**
   * 设置自动调整大小
   */
  const setupAutoResize = (): void => {
    if (!container.value) return;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height, width } = entry.contentRect;
        resize(width, height);
      }
    });

    resizeObserver.observe(container.value);
  };

  /**
   * 开始渲染循环
   */
  const startRenderLoop = (): void => {
    if (isRendering.value || !isInitialized.value) return;

    isRendering.value = true;

    const animate = () => {
      if (!isRendering.value) return;

      // 更新控制器
      if (controls.value) {
        controls.value.update();
      }

      // 渲染场景
      render();

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    if (config.debug) {
      console.warn('[useThreeEngine] Render loop started');
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

    if (config.debug) {
      console.warn('[useThreeEngine] Render loop stopped');
    }
  };

  /**
   * 渲染单帧
   */
  const render = (): void => {
    if (!scene.value || !camera.value || !renderer.value) return;

    try {
      renderer.value.render(scene.value, camera.value);

      // 只在有监听器时发送渲染事件（避免性能问题）
      if (eventBus.getListenerCount('engine:render') > 0) {
        eventBus.emit('engine:render', {
          camera: camera.value,
          renderer: renderer.value,
          scene: scene.value,
        });
      }
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;
      console.error('[useThreeEngine] Render error:', errorObj);
    }
  };

  /**
   * 调整大小
   */
  const resize = (width: number, height: number): void => {
    if (!camera.value || !renderer.value) return;

    // 更新相机
    camera.value.aspect = width / height;
    camera.value.updateProjectionMatrix();

    // 更新渲染器
    renderer.value.setSize(width, height);

    eventBus.emit('engine:resize', { height, width });

    if (config.debug) {
      console.warn(`[useThreeEngine] Resized to ${width}x${height}`);
    }
  };

  /**
   * 添加对象到场景
   */
  const add = (object: THREE.Object3D): void => {
    if (!scene.value) return;

    scene.value.add(object);
    eventBus.emit('engine:objectAdded', { object });
  };

  /**
   * 从场景移除对象
   */
  const remove = (object: THREE.Object3D): void => {
    if (!scene.value) return;

    scene.value.remove(object);
    eventBus.emit('engine:objectRemoved', { object });
  };

  /**
   * 清空场景
   */
  const clear = (): void => {
    if (!scene.value) return;

    // 保留光源，只清理其他对象
    const objectsToRemove = scene.value.children.filter(
      (child) =>
        !(child instanceof THREE.Light) &&
        !(child instanceof THREE.GridHelper) &&
        !(child instanceof THREE.AxesHelper),
    );

    objectsToRemove.forEach((object) => {
      scene.value?.remove(object);

      // 清理资源
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

    eventBus.emit('engine:sceneCleared', {});
  };

  /**
   * 设置相机位置
   */
  const setCameraPosition = (
    position: THREE.Vector3Like,
    animate = false,
  ): void => {
    if (!camera.value) return;

    const targetPosition = new THREE.Vector3(
      position.x ?? 0,
      position.y ?? 0,
      position.z ?? 0,
    );

    if (animate) {
      // 简单的动画实现
      const startPosition = camera.value.position.clone();
      const duration = 1000;
      const startTime = performance.now();

      const animateCamera = () => {
        if (!camera.value) return;

        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        camera.value.position.lerpVectors(
          startPosition,
          targetPosition,
          progress,
        );

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };

      animateCamera();
    } else {
      camera.value.position.copy(targetPosition);
    }
  };

  /**
   * 设置相机目标
   */
  const setCameraTarget = (target: THREE.Vector3Like): void => {
    if (!camera.value || !controls.value) return;

    const targetVector = new THREE.Vector3(
      target.x ?? 0,
      target.y ?? 0,
      target.z ?? 0,
    );
    controls.value.target.copy(targetVector);
    controls.value.update();
  };

  /**
   * 设置控制器属性（解决 readonly 问题）
   */
  const setControlsProperty = <K extends keyof OrbitControls>(
    key: K,
    value: OrbitControls[K],
  ): void => {
    if (!controls.value) return;

    controls.value[key] = value;
    controls.value.update();
  };

  /**
   * 设置自动旋转
   */
  const setAutoRotate = (enabled: boolean): void => {
    setControlsProperty('autoRotate', enabled);
  };

  /**
   * 设置自动旋转速度
   */
  const setAutoRotateSpeed = (speed: number): void => {
    setControlsProperty('autoRotateSpeed', speed);
  };

  /**
   * 启用/禁用控制器
   */
  const setControlsEnabled = (enabled: boolean): void => {
    if (!controls.value) return;

    controls.value.enableRotate = enabled;
    controls.value.enablePan = enabled;
    controls.value.enableZoom = enabled;
    controls.value.update();
  };

  /**
   * 获取控制器配置（只读副本）
   */
  const getControlsConfig = (): null | Partial<OrbitControlsConfig> => {
    if (!controls.value) return null;

    const ctrl = controls.value;
    return {
      autoRotate: ctrl.autoRotate,
      autoRotateSpeed: ctrl.autoRotateSpeed,
      dampingFactor: ctrl.dampingFactor,
      enableDamping: ctrl.enableDamping,
      enablePan: ctrl.enablePan,
      enableRotate: ctrl.enableRotate,
      enableZoom: ctrl.enableZoom,
      maxAzimuthAngle: ctrl.maxAzimuthAngle,
      maxDistance: ctrl.maxDistance,
      maxPolarAngle: ctrl.maxPolarAngle,
      minAzimuthAngle: ctrl.minAzimuthAngle,
      minDistance: ctrl.minDistance,
      minPolarAngle: ctrl.minPolarAngle,
    };
  };

  /**
   * 射线检测
   */
  const getIntersection = (
    mousePosition: THREE.Vector2,
  ): null | THREE.Intersection => {
    if (!scene.value || !camera.value || !container.value) return null;

    raycaster.setFromCamera(mousePosition, camera.value);
    const intersects = raycaster.intersectObjects(scene.value.children, true);

    return (
      intersects.find(
        (intersect) =>
          intersect.object instanceof THREE.Mesh && intersect.object.material,
      ) || null
    );
  };

  /**
   * 截图
   */
  const screenshot = (format: 'jpeg' | 'png' = 'png', quality = 1): string => {
    if (!renderer.value) {
      throw new Error('Renderer not initialized');
    }

    return renderer.value.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality,
    );
  };

  /**
   * 清理资源
   */
  const dispose = (): void => {
    try {
      // 停止渲染
      stopRenderLoop();

      // 清理观察器
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      // 清理控制器
      if (controls.value) {
        controls.value.dispose();
        controls.value = null;
      }

      // 清理场景
      if (scene.value) {
        clear();
        scene.value = null;
      }

      // 清理渲染器
      if (renderer.value) {
        renderer.value.dispose();
        renderer.value.domElement.remove();
        renderer.value = null;
      }

      // 清理相机
      camera.value = null;
      container.value = null;

      // 重置状态
      isInitialized.value = false;
      error.value = null;

      eventBus.emit('engine:disposed', {});

      if (config.debug) {
        console.warn('[useThreeEngine] Resources disposed');
      }
    } catch (error_) {
      const errorObj = error_ as Error;
      error.value = errorObj;
      console.error('[useThreeEngine] Dispose error:', errorObj);
    }
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    dispose();
  });

  return {
    // 场景管理
    add,
    camera: readonly(camera) as Readonly<Ref<null | THREE.PerspectiveCamera>>,
    clear,
    clock: readonly(clock),
    controls: readonly(controls) as Readonly<Ref<null | OrbitControls>>,

    // 资源管理
    dispose,
    error: readonly(error),
    getControlsConfig,
    getIntersection,

    // 核心方法
    initialize,
    // 状态
    isInitialized: readonly(isInitialized),
    isRendering: readonly(isRendering),
    remove,
    render,

    renderer: readonly(renderer) as Readonly<Ref<null | THREE.WebGLRenderer>>,
    resize,
    // 核心实例 (只读)
    scene: readonly(scene) as Readonly<Ref<null | THREE.Scene>>,

    // 工具方法
    screenshot,
    // 相机控制
    setAutoRotate,
    setAutoRotateSpeed,
    setCameraPosition,

    setCameraTarget,
    setControlsEnabled,
    setControlsProperty,
    startRenderLoop,

    stopRenderLoop,
  };
}

// 注入键
export const ThreeEngineKey = Symbol(
  'ThreeEngine',
) as InjectionKey<ThreeEngineContext>;

/**
 * 注入 Three.js 引擎上下文
 */
export function injectThreeEngine(): null | ThreeEngineContext {
  return inject(ThreeEngineKey, null);
}
