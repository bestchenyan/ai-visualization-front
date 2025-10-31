import type { Ref } from 'vue';

import type { BaseConfig } from '@/types/common';
import type {
  LoaderAPI,
  LoaderEventData,
  LoadProgress,
  ModelFormat as ModelFormatType,
  ModelInfo,
  ModelLoadOptions,
} from '@/types/three/loader';

import { onUnmounted, readonly, ref, shallowRef } from 'vue';

import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { useEventBus } from '@/services/events/EventBus';
import { ModelFormat } from '@/types/three/loader';

/** useModelLoader 配置选项 */
export interface UseModelLoaderOptions extends BaseConfig {
  /** 缓存大小限制 (MB) */
  cacheLimit?: number;
  /** 默认加载选项 */
  defaultOptions?: ModelLoadOptions;
  /** 默认 Draco 解码器路径 */
  dracoDecoderPath?: string;
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * Three.js 模型加载器 Composable
 *
 * 功能特性：
 * - 支持多种模型格式（GLTF、FBX、OBJ、STL、PLY）
 * - Draco 压缩支持
 * - 加载进度监控
 * - 模型缓存系统
 * - 自动模型处理（居中、缩放）
 * - 批量加载支持
 *
 * @param options 配置选项
 * @returns LoaderAPI 模型加载器接口
 */
export function useModelLoader(options: UseModelLoaderOptions = {}): LoaderAPI {
  // 状态管理
  const loading = ref(false);
  const progress = ref<LoadProgress>({
    loaded: 0,
    percentage: 0,
    speed: 0,
    timeRemaining: 0,
    total: 0,
  });
  const loadedModels = shallowRef(new Map<string, THREE.Object3D>());
  const modelInfos = shallowRef(new Map<string, ModelInfo>());
  const error = ref<Error | null>(null);

  // 加载器实例
  const loaders = new Map<ModelFormatType, any>();
  const loadingManager = new THREE.LoadingManager();

  // 事件总线
  const eventBus = useEventBus();

  // 默认配置
  const defaultOptions: ModelLoadOptions = {
    autoCenter: true,
    autoScale: false,
    dracoDecoderPath: options.dracoDecoderPath || '/draco/',
    generateBoundingBox: true,
    targetSize: 10,
    useDraco: true,
    ...options.defaultOptions,
  };

  /**
   * 初始化加载器
   */
  const initializeLoaders = (): void => {
    // GLTF 加载器
    const gltfLoader = new GLTFLoader(loadingManager);
    if (defaultOptions.useDraco) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(defaultOptions.dracoDecoderPath || '/draco/');
      gltfLoader.setDRACOLoader(dracoLoader);
    }
    loaders.set(ModelFormat.GLTF, gltfLoader);
    loaders.set(ModelFormat.GLB, gltfLoader);

    // FBX 加载器
    loaders.set(ModelFormat.FBX, new FBXLoader(loadingManager));

    // OBJ 加载器
    loaders.set(ModelFormat.OBJ, new OBJLoader(loadingManager));

    // STL 加载器
    loaders.set(ModelFormat.STL, new STLLoader(loadingManager));

    // PLY 加载器
    loaders.set(ModelFormat.PLY, new PLYLoader(loadingManager));
  };

  /**
   * 设置加载管理器事件
   */
  const setupLoadingManager = (): void => {
    let startTime = 0;
    let lastLoaded = 0;
    let lastTime = 0;

    loadingManager.onStart = (url, _itemsLoaded, _itemsTotal) => {
      loading.value = true;
      startTime = performance.now();
      lastTime = startTime;
      lastLoaded = 0;
      error.value = null;

      if (options.debug) {
        console.warn(`[useModelLoader] Started loading: ${url}`);
      }
    };

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      const deltaLoaded = itemsLoaded - lastLoaded;

      const percentage = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0;
      const speed = deltaTime > 0 ? (deltaLoaded / deltaTime) * 1000 : 0;
      const remaining = speed > 0 ? (itemsTotal - itemsLoaded) / speed : 0;

      progress.value = {
        loaded: itemsLoaded,
        percentage,
        speed,
        timeRemaining: remaining,
        total: itemsTotal,
      };

      lastLoaded = itemsLoaded;
      lastTime = currentTime;

      const eventData: LoaderEventData['loader:progress'] = {
        progress: progress.value,
        url,
      };
      eventBus.emit('loader:progress', eventData);
    };

    loadingManager.onLoad = () => {
      loading.value = false;
      progress.value = {
        loaded: 0,
        percentage: 100,
        speed: 0,
        timeRemaining: 0,
        total: 0,
      };

      if (options.debug) {
        console.warn('[useModelLoader] All models loaded');
      }
    };

    loadingManager.onError = (url) => {
      loading.value = false;
      const errorObj = new Error(`Failed to load model: ${url}`);
      error.value = errorObj;

      const eventData: LoaderEventData['loader:error'] = {
        error: errorObj,
        url,
      };
      eventBus.emit('loader:error', eventData);

      console.error(`[useModelLoader] Error loading: ${url}`);
    };
  };

  /**
   * 检测模型格式
   */
  const detectFormat = (url: string): ModelFormat => {
    const extension = url.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'fbx': {
        return ModelFormat.FBX;
      }
      case 'glb': {
        return ModelFormat.GLB;
      }
      case 'gltf': {
        return ModelFormat.GLTF;
      }
      case 'obj': {
        return ModelFormat.OBJ;
      }
      case 'ply': {
        return ModelFormat.PLY;
      }
      case 'stl': {
        return ModelFormat.STL;
      }
      default: {
        throw new Error(`Unsupported model format: ${extension}`);
      }
    }
  };

  /**
   * 处理模型
   */
  const processModel = (
    model: THREE.Object3D,
    options: ModelLoadOptions,
  ): THREE.Object3D => {
    // 计算边界框
    const boundingBox = new THREE.Box3().setFromObject(model);

    // 自动居中
    if (options.autoCenter) {
      const center = boundingBox.getCenter(new THREE.Vector3());
      model.position.sub(center);
      // 重新计算边界框
      boundingBox.setFromObject(model);
    }

    // 自动缩放
    if (options.autoScale && options.targetSize) {
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      if (maxSize > 0) {
        const scale = options.targetSize / maxSize;
        model.scale.multiplyScalar(scale);
      }
    }

    // 材质覆盖
    if (options.materialOverride) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = options.materialOverride;
        }
      });
    }

    return model;
  };

  /**
   * 计算模型信息
   */
  const calculateModelInfo = (
    model: THREE.Object3D,
    url: string,
    format: ModelFormat,
    loadTime: number,
  ): ModelInfo => {
    let geometryCount = 0;
    let materialCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;
    const materials = new Set<THREE.Material>();

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        geometryCount++;

        if (child.geometry) {
          const positionAttribute = child.geometry.getAttribute('position');
          if (positionAttribute) {
            vertexCount += positionAttribute.count;

            triangleCount += child.geometry.index
              ? child.geometry.index.count / 3
              : positionAttribute.count / 3;
          }
        }

        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => materials.add(mat));
        } else if (child.material) {
          materials.add(child.material);
        }
      }
    });

    materialCount = materials.size;
    const boundingBox = new THREE.Box3().setFromObject(model);

    return {
      boundingBox,
      format,
      geometryCount,
      loadTime,
      materialCount,
      name: model.name || url.split('/').pop() || 'Unknown',
      triangleCount,
      url,
      uuid: model.uuid,
      vertexCount,
    };
  };

  /**
   * 加载单个模型
   */
  const loadModel = async (
    url: string,
    options: ModelLoadOptions = {},
  ): Promise<THREE.Object3D> => {
    const opts = { ...defaultOptions, ...options };
    const format = opts.format || detectFormat(url);

    // 检查缓存
    if (options.enableCache !== false) {
      const cached = loadedModels.value.get(url);
      if (cached) {
        const eventData: LoaderEventData['loader:cache:hit'] = {
          model: cached.clone(),
          url,
        };
        eventBus.emit('loader:cache:hit', eventData);

        if (options.debug) {
          console.warn(`[useModelLoader] Cache hit: ${url}`);
        }

        return cached.clone();
      } else {
        const eventData: LoaderEventData['loader:cache:miss'] = { url };
        eventBus.emit('loader:cache:miss', eventData);
      }
    }

    const loader = loaders.get(format);
    if (!loader) {
      throw new Error(`No loader available for format: ${format}`);
    }

    const startTime = performance.now();

    // 发送开始加载事件
    const startEventData: LoaderEventData['loader:start'] = {
      format,
      options: opts,
      url,
    };
    eventBus.emit('loader:start', startEventData);

    return new Promise((resolve, reject) => {
      const onLoad = (result: any) => {
        try {
          let model: THREE.Object3D;

          // 处理不同加载器的返回格式
          if (format === ModelFormat.GLTF || format === ModelFormat.GLB) {
            model = result.scene;
          } else if (format === ModelFormat.STL || format === ModelFormat.PLY) {
            // STL 和 PLY 返回几何体，需要创建网格
            const geometry = result;
            const material = new THREE.MeshPhongMaterial({ color: 0x80_80_80 });
            model = new THREE.Mesh(geometry, material);
          } else {
            model = result;
          }

          // 处理模型
          const processedModel = processModel(model, opts);
          const loadTime = performance.now() - startTime;

          // 计算模型信息
          const info = calculateModelInfo(
            processedModel,
            url,
            format,
            loadTime,
          );
          modelInfos.value.set(url, info);

          // 缓存模型
          if (options.enableCache !== false) {
            loadedModels.value.set(url, processedModel.clone());
          }

          // 发送完成事件
          const completeEventData: LoaderEventData['loader:complete'] = {
            info,
            model: processedModel,
            url,
          };
          eventBus.emit('loader:complete', completeEventData);

          resolve(processedModel);
        } catch (error_) {
          reject(error_);
        }
      };

      const onProgress = (_progressEvent: ProgressEvent) => {
        // 进度事件由 LoadingManager 处理
      };

      const onError = (err: any) => {
        const error = new Error(
          `Failed to load model ${url}: ${err.message || err}`,
        );
        reject(error);
      };

      // 调用相应的加载器
      loader.load(url, onLoad, onProgress, onError);
    });
  };

  /**
   * 批量加载模型
   */
  const loadMultipleModels = async (
    urls: string[],
    options: ModelLoadOptions = {},
  ): Promise<THREE.Object3D[]> => {
    const promises = urls.map((url) => loadModel(url, options));
    return Promise.all(promises);
  };

  /**
   * 预加载模型（仅缓存，不返回）
   */
  const preloadModel = async (
    url: string,
    options: ModelLoadOptions = {},
  ): Promise<void> => {
    await loadModel(url, { ...options, enableCache: true });
  };

  /**
   * 获取模型信息
   */
  const getModelInfo = (url: string): ModelInfo | null => {
    return modelInfos.value.get(url) || null;
  };

  /**
   * 获取缓存的模型
   */
  const getCachedModel = (url: string): null | THREE.Object3D => {
    const cached = loadedModels.value.get(url);
    return cached ? cached.clone() : null;
  };

  /**
   * 清理缓存
   */
  const clearCache = (url?: string): void => {
    if (url) {
      loadedModels.value.delete(url);
      modelInfos.value.delete(url);
    } else {
      loadedModels.value.clear();
      modelInfos.value.clear();
    }

    if (options.debug) {
      console.warn(`[useModelLoader] Cache cleared: ${url || 'all'}`);
    }
  };

  /**
   * 设置 Draco 解码器路径
   */
  const setDracoDecoderPath = (path: string): void => {
    const gltfLoader = loaders.get(ModelFormat.GLTF) as GLTFLoader;
    if (gltfLoader) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(path);
      gltfLoader.setDRACOLoader(dracoLoader);
    }
  };

  /**
   * 清理资源
   */
  const dispose = (): void => {
    // 停止所有加载
    loading.value = false;

    // 清理缓存
    clearCache();

    // 清理加载器
    loaders.forEach((loader) => {
      if (loader.dispose) {
        loader.dispose();
      }
    });
    loaders.clear();

    // 重置状态
    progress.value = {
      loaded: 0,
      percentage: 0,
      speed: 0,
      timeRemaining: 0,
      total: 0,
    };
    error.value = null;

    if (options.debug) {
      console.warn('[useModelLoader] Resources disposed');
    }
  };

  // 初始化
  initializeLoaders();
  setupLoadingManager();

  // 组件卸载时自动清理
  onUnmounted(() => {
    dispose();
  });

  return {
    clearCache,
    dispose,
    error: readonly(error),
    getCachedModel,
    getModelInfo,

    loadedModels: readonly(loadedModels) as Readonly<
      Ref<Map<string, THREE.Object3D>>
    >,
    loading: readonly(loading),
    loadModel,
    loadMultipleModels,
    modelInfos: readonly(modelInfos) as Readonly<Ref<Map<string, ModelInfo>>>,
    preloadModel,
    progress: readonly(progress),
    setDracoDecoderPath,
  };
}
