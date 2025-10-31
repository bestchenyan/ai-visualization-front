import type * as THREE from 'three';

import type { Ref } from 'vue';

/** 控制器类型 */
export enum ControlsType {
  FirstPerson = 'FirstPersonControls',
  Fly = 'FlyControls',
  Orbit = 'OrbitControls',
  Transform = 'TransformControls',
}

/** 轨道控制器配置 */
export interface OrbitControlsConfig {
  /** 自动旋转 */
  autoRotate: boolean;
  /** 自动旋转速度 */
  autoRotateSpeed: number;
  /** 阻尼系数 */
  dampingFactor: number;
  /** 启用阻尼 */
  enableDamping: boolean;
  /** 启用平移 */
  enablePan: boolean;
  /** 启用旋转 */
  enableRotate: boolean;
  /** 启用缩放 */
  enableZoom: boolean;
  /** 最大方位角 */
  maxAzimuthAngle: number;
  /** 最大距离 */
  maxDistance: number;
  /** 最大极角 */
  maxPolarAngle: number;
  /** 最小方位角 */
  minAzimuthAngle: number;
  /** 最小距离 */
  minDistance: number;
  /** 最小极角 */
  minPolarAngle: number;
}

/** 变换控制器配置 */
export interface TransformControlsConfig {
  /** 控制模式 */
  mode: 'rotate' | 'scale' | 'translate';
  /** 显示辅助线 */
  showX: boolean;
  /** 显示Y轴 */
  showY: boolean;
  /** 显示Z轴 */
  showZ: boolean;
  /** 控制器大小 */
  size: number;
  /** 空间模式 */
  space: 'local' | 'world';
}

/** 控制器事件类型 */
export type ControlsEventType =
  | 'controls:change'
  | 'controls:end'
  | 'controls:modeChanged'
  | 'controls:start'
  | 'transform:objectChanged';

/** 控制器事件数据 */
export interface ControlsEventData {
  'controls:change': {
    camera: THREE.Camera;
    controls: any;
  };
  'controls:end': {
    camera: THREE.Camera;
    controls: any;
  };
  'controls:modeChanged': {
    controls: any;
    mode: string;
  };
  'controls:start': {
    controls: any;
    type: ControlsType;
  };
  'transform:objectChanged': {
    object: THREE.Object3D;
    property: 'position' | 'rotation' | 'scale';
    value: THREE.Euler | THREE.Vector3;
  };
}

/** 控制器 API 接口 */
export interface ControlsAPI {
  // 状态 (只读)
  controls: Readonly<Ref<any>>;
  // 方法
  createOrbitControls: (
    camera: THREE.Camera,
    domElement: HTMLElement,
    config?: Partial<OrbitControlsConfig>,
  ) => any;
  createTransformControls: (
    camera: THREE.Camera,
    domElement: HTMLElement,
    config?: Partial<TransformControlsConfig>,
  ) => any;
  dispose: () => void;

  enabled: Readonly<Ref<boolean>>;
  reset: () => void;
  restoreState: (state: any) => void;
  saveState: () => any;
  setEnabled: (enabled: boolean) => void;
  setTarget: (target: THREE.Vector3Like) => void;
  switchControls: (
    type: ControlsType,
    camera: THREE.Camera,
    domElement: HTMLElement,
  ) => void;
  target: Readonly<Ref<THREE.Vector3>>;
  type: Readonly<Ref<ControlsType>>;
  update: () => void;
}
