import type * as THREE from 'three';

import type { Ref } from 'vue';

/** 支持的模型格式 */
export enum ModelFormat {
  FBX = 'fbx',
  GLB = 'glb',
  GLTF = 'gltf',
  OBJ = 'obj',
  PLY = 'ply',
  STL = 'stl',
}

/** 模型加载选项 */
export interface ModelLoadOptions {
  /** 是否自动居中 */
  autoCenter?: boolean;
  /** 是否自动缩放 */
  autoScale?: boolean;
  debug?: boolean;
  /** Draco 解码器路径 */
  dracoDecoderPath?: string;
  // 是否启用缓存
  enableCache?: boolean;
  /** 模型格式 */
  format?: ModelFormat;
  /** 是否生成边界框 */
  generateBoundingBox?: boolean;
  /** 材质覆盖 */
  materialOverride?: THREE.Material;

  /** 目标尺寸 */
  targetSize?: number;

  /** 是否启用 Draco 压缩 */
  useDraco?: boolean;
}

/** 模型信息 */
export interface ModelInfo {
  /** 边界框 */
  boundingBox: THREE.Box3;
  /** 模型格式 */
  format: ModelFormat;
  /** 几何体数量 */
  geometryCount: number;
  /** 加载时间 */
  loadTime: number;
  /** 材质数量 */
  materialCount: number;
  /** 模型名称 */
  name: string;
  /** 文件大小 */
  size?: number;
  /** 三角形数量 */
  triangleCount: number;
  /** 文件路径 */
  url: string;
  /** 模型 UUID */
  uuid: string;
  /** 顶点数量 */
  vertexCount: number;
}

/** 加载进度信息 */
export interface LoadProgress {
  /** 已加载字节数 */
  loaded: number;
  /** 进度百分比 */
  percentage: number;
  /** 加载速度 (bytes/s) */
  speed: number;
  /** 剩余时间 (ms) */
  timeRemaining: number;
  /** 总字节数 */
  total: number;
}

/** 加载器事件类型 */
export type LoaderEventType =
  | 'loader:cache:hit'
  | 'loader:cache:miss'
  | 'loader:complete'
  | 'loader:error'
  | 'loader:progress'
  | 'loader:start';

/** 加载器事件数据 */
export interface LoaderEventData {
  'loader:cache:hit': {
    model: THREE.Object3D;
    url: string;
  };
  'loader:cache:miss': {
    url: string;
  };
  'loader:complete': {
    info: ModelInfo;
    model: THREE.Object3D;
    url: string;
  };
  'loader:error': {
    error: Error;
    url: string;
  };
  'loader:progress': {
    progress: LoadProgress;
    url: string;
  };
  'loader:start': {
    format: ModelFormat;
    options: ModelLoadOptions;
    url: string;
  };
}

/** 模型加载器 API 接口 */
export interface LoaderAPI {
  clearCache: (url?: string) => void;
  dispose: () => void;
  error: Readonly<Ref<Error | null>>;
  getCachedModel: (url: string) => null | THREE.Object3D;
  getModelInfo: (url: string) => ModelInfo | null;

  loadedModels: Readonly<Ref<Map<string, THREE.Object3D>>>;
  // 状态 (只读)
  loading: Readonly<Ref<boolean>>;
  // 方法
  loadModel: (
    url: string,
    options?: ModelLoadOptions,
  ) => Promise<THREE.Object3D>;
  loadMultipleModels: (
    urls: string[],
    options?: ModelLoadOptions,
  ) => Promise<THREE.Object3D[]>;
  modelInfos: Readonly<Ref<Map<string, ModelInfo>>>;
  preloadModel: (url: string, options?: ModelLoadOptions) => Promise<void>;
  progress: Readonly<Ref<LoadProgress>>;
  setDracoDecoderPath: (path: string) => void;
}
