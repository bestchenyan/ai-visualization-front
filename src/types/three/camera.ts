import type * as THREE from 'three';

import type { Ref } from 'vue';

/** 相机类型 */
export enum CameraType {
  Orthographic = 'OrthographicCamera',
  Perspective = 'PerspectiveCamera',
}

/** 透视相机配置 */
export interface PerspectiveCameraConfig {
  /** 宽高比 */
  aspect: number;
  /** 远裁剪面 */
  far: number;
  /** 视野角度 */
  fov: number;
  /** 近裁剪面 */
  near: number;
  /** 相机位置 */
  position: THREE.Vector3Like;
  /** 相机朝向目标 */
  target: THREE.Vector3Like;
}

/** 正交相机配置 */
export interface OrthographicCameraConfig {
  /** 下边界 */
  bottom: number;
  /** 远裁剪面 */
  far: number;
  /** 左边界 */
  left: number;
  /** 近裁剪面 */
  near: number;
  /** 相机位置 */
  position: THREE.Vector3Like;
  /** 右边界 */
  right: number;
  /** 相机朝向目标 */
  target: THREE.Vector3Like;
  /** 上边界 */
  top: number;
}

/** 相机动画配置 */
export interface CameraAnimationConfig {
  /** 动画持续时间 */
  duration: number;
  /** 缓动函数 */
  easing: 'easeIn' | 'easeInOut' | 'easeOut' | 'linear';
  /** 动画完成回调 */
  onComplete?: () => void;
}

/** 相机预设 */
export interface CameraPreset {
  /** 视野角度（仅透视相机） */
  fov?: number;
  /** 预设名称 */
  name: string;
  /** 相机位置 */
  position: THREE.Vector3Like;
  /** 目标位置 */
  target: THREE.Vector3Like;
}

/** 相机事件类型 */
export type CameraEventType =
  | 'camera:animationEnd'
  | 'camera:animationStart'
  | 'camera:moved'
  | 'camera:presetChanged'
  | 'camera:rotated'
  | 'camera:zoomed';

/** 相机事件数据 */
export interface CameraEventData {
  'camera:animationEnd': {
    camera: THREE.Camera;
    position: THREE.Vector3;
  };
  'camera:animationStart': {
    camera: THREE.Camera;
    from: THREE.Vector3;
    to: THREE.Vector3;
  };
  'camera:moved': {
    camera: THREE.Camera;
    position: THREE.Vector3;
    target: THREE.Vector3;
  };
  'camera:presetChanged': {
    camera: THREE.Camera;
    preset: CameraPreset;
  };
  'camera:rotated': {
    camera: THREE.Camera;
    rotation: THREE.Euler;
  };
  'camera:zoomed': {
    camera: THREE.Camera;
    fov?: number;
    zoom: number;
  };
}

/** 相机 API 接口 */
export interface CameraAPI {
  animateTo: (
    position: THREE.Vector3Like,
    target?: THREE.Vector3Like,
    config?: CameraAnimationConfig,
  ) => Promise<void>;
  // 状态 (只读)
  camera: Readonly<Ref<null | THREE.Camera>>;
  createOrthographicCamera: (
    config: Partial<OrthographicCameraConfig>,
  ) => THREE.OrthographicCamera;
  // 方法
  createPerspectiveCamera: (
    config: Partial<PerspectiveCameraConfig>,
  ) => THREE.PerspectiveCamera;

  currentPreset: Readonly<Ref<CameraPreset | null>>;
  dispose: () => void;
  isAnimating: Readonly<Ref<boolean>>;
  lookAt: (target: THREE.Vector3Like, animate?: boolean) => void;
  savePreset: (name: string) => CameraPreset;
  setPosition: (position: THREE.Vector3Like, animate?: boolean) => void;
  setPreset: (preset: CameraPreset, animate?: boolean) => void;
  switchCamera: (type: CameraType, config?: any) => void;
  type: Readonly<Ref<CameraType>>;
  updateAspect: (aspect: number) => void;
  zoomToFit: (object: THREE.Object3D, margin?: number) => void;
}
