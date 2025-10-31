export { useModelLoader } from './useModelLoader';
export type { UseModelLoaderOptions } from './useModelLoader';

export { useThreeCamera } from './useThreeCamera';
export type { UseThreeCameraOptions } from './useThreeCamera';
export { useThreeControls } from './useThreeControls';
export type { UseThreeControlsOptions } from './useThreeControls';
// 导出统一引擎 (推荐使用)
export {
  injectThreeEngine,
  ThreeEngineKey,
  useThreeEngine,
} from './useThreeEngine';

export type {
  ThreeEngineAPI,
  ThreeEngineConfig,
  ThreeEngineContext,
} from './useThreeEngine';
export { useThreeRenderer } from './useThreeRenderer';
export type { UseThreeRendererOptions } from './useThreeRenderer';
// 导出独立 Composables (高级用法)
export { useThreeScene } from './useThreeScene';
// 导出配置类型
export type { UseThreeSceneOptions } from './useThreeScene';

// 导出相机相关类型
export type {
  CameraAPI,
  CameraEventData,
  CameraEventType,
  CameraPreset,
  CameraType,
  OrthographicCameraConfig,
  PerspectiveCameraConfig,
} from '@/types/three/camera';

// 导出控制器相关类型
export type {
  ControlsAPI,
  ControlsEventData,
  ControlsEventType,
  ControlsType,
  OrbitControlsConfig,
  TransformControlsConfig,
} from '@/types/three/controls';

// 导出加载器相关类型
export type {
  LoaderAPI,
  LoaderEventData,
  LoaderEventType,
  LoadProgress,
  ModelFormat,
  ModelInfo,
  ModelLoadOptions,
} from '@/types/three/loader';

// 导出渲染器相关类型
export type {
  RendererAPI,
  RendererConfig as RendererConfigType,
  RendererEventData,
  RendererEventType,
  RendererStats,
} from '@/types/three/renderer';

// 导出场景相关类型
export type {
  CameraConfig,
  RendererConfig,
  SceneAPI,
  SceneConfig,
  SceneEventData,
  SceneEventType,
} from '@/types/three/scene';
