import type * as THREE from 'three';

import type { Ref } from 'vue';

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

/** 渲染器统计信息 */
export interface RendererStats {
  /** 渲染调用次数 */
  calls: number;
  /** 几何体数量 */
  geometries: number;
  /** 内存使用 */
  memory: {
    geometries: number;
    textures: number;
  };
  /** 着色器数量 */
  programs: number;
  /** 纹理数量 */
  textures: number;
  /** 三角形数量 */
  triangles: number;
}

/** 渲染器事件类型 */
export type RendererEventType =
  | 'renderer:afterRender'
  | 'renderer:beforeRender'
  | 'renderer:contextLost'
  | 'renderer:contextRestored'
  | 'renderer:resize';

/** 渲染器事件数据 */
export interface RendererEventData {
  'renderer:afterRender': {
    renderer: THREE.WebGLRenderer;
    renderTime: number;
    stats: RendererStats;
  };
  'renderer:beforeRender': {
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
  };
  'renderer:contextLost': {
    renderer: THREE.WebGLRenderer;
  };
  'renderer:contextRestored': {
    renderer: THREE.WebGLRenderer;
  };
  'renderer:resize': {
    height: number;
    pixelRatio: number;
    width: number;
  };
}

/** 渲染器 API 接口 */
export interface RendererAPI {
  dispose: () => void;
  isRendering: Readonly<Ref<boolean>>;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  // 状态 (只读)
  renderer: Readonly<Ref<null | THREE.WebGLRenderer>>;

  renderTime: Readonly<Ref<number>>;
  resize: (width: number, height: number) => void;
  screenshot: (format?: 'jpeg' | 'png', quality?: number) => string;
  // 方法
  startRenderLoop: () => void;
  stats: Readonly<Ref<RendererStats>>;
  stopRenderLoop: () => void;
  updateConfig: (config: Partial<RendererConfig>) => void;
}
