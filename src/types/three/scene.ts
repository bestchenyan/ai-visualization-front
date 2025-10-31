import type * as THREE from 'three';

import type { Ref } from 'vue';

/** 场景配置 */
export interface SceneConfig {
  /** 背景模糊度 */
  backgroundBlurriness: number;
  /** 背景颜色 */
  backgroundColor: number;
  /** 背景强度 */
  backgroundIntensity: number;
  /** 相机位置 */
  cameraPosition: THREE.Vector3Like;
  /** 环境贴图 */
  environment: null | THREE.Texture;
  /** 远裁剪面 */
  far: number;
  /** 雾效 */
  fog: null | THREE.Fog | THREE.FogExp2;
  /** 相机视野角度 */
  fov: number;
  /** 近裁剪面 */
  near: number;
  /** 渲染器选项 */
  rendererOptions: THREE.WebGLRendererParameters;
}

/** 渲染器配置 */
export interface RendererConfig {
  /** 透明背景 */
  alpha: boolean;
  /** 抗锯齿 */
  antialias: boolean;
  /** 输出颜色空间 */
  outputColorSpace: THREE.ColorSpace;
  /** 像素比 */
  pixelRatio: number;
  /** 保留绘制缓冲 */
  preserveDrawingBuffer: boolean;
  /** 启用阴影贴图 */
  shadowMapEnabled: boolean;
  /** 阴影贴图类型 */
  shadowMapType: THREE.ShadowMapType;
  /** 色调映射 */
  toneMapping: THREE.ToneMapping;
  /** 色调映射曝光度 */
  toneMappingExposure: number;
}

/** 相机配置 */
export interface CameraConfig {
  /** 宽高比 */
  aspect: number;
  /** 远裁剪面 */
  far: number;
  /** 视野角度 */
  fov: number;
  /** 相机朝向 */
  lookAt: THREE.Vector3Like;
  /** 近裁剪面 */
  near: number;
  /** 相机位置 */
  position: THREE.Vector3Like;
}

/** 场景事件类型 */
export type SceneEventType =
  | 'scene:cleared'
  | 'scene:disposed'
  | 'scene:error'
  | 'scene:initialized'
  | 'scene:objectAdded'
  | 'scene:objectRemoved'
  | 'scene:resized';

/** 场景事件数据 */
export interface SceneEventData {
  'scene:cleared': Record<string, never>;
  'scene:disposed': Record<string, never>;
  'scene:error': {
    error: Error;
  };
  'scene:initialized': {
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
  };
  'scene:objectAdded': {
    object: THREE.Object3D;
  };
  'scene:objectRemoved': {
    object: THREE.Object3D;
  };
  'scene:resized': {
    height: number;
    width: number;
  };
}

/** 场景 API 接口 */
export interface SceneAPI {
  add: (object: THREE.Object3D) => void;
  camera: Readonly<Ref<null | THREE.PerspectiveCamera>>;
  clear: () => void;
  dispose: () => void;
  error: Readonly<Ref<Error | null>>;

  // 方法
  initScene: (container: HTMLElement) => void;
  isInitialized: Readonly<Ref<boolean>>;
  remove: (object: THREE.Object3D) => void;
  render: () => void;
  renderer: Readonly<Ref<null | THREE.WebGLRenderer>>;
  resize: (width: number, height: number) => void;
  // 状态 (只读)
  scene: Readonly<Ref<null | THREE.Scene>>;
}
