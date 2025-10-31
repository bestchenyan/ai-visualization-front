# Three.js 核心 Composables

这个目录包含了基于 Vue 3 Composition API 的 Three.js 核心功能模块，提供了完整的 3D 场景管理、渲染控制、相机操作和模型加载功能。

## 🎯 核心模块

### 1. useThreeScene - 场景管理

负责 Three.js 场景的创建、管理和资源清理。

```typescript
import { useThreeScene } from '@/composables/core/three';

const sceneAPI = useThreeScene({
  debug: true,
  autoResize: true,
  scene: {
    backgroundColor: 0x2a2a2a,
    fov: 75,
    cameraPosition: { x: 5, y: 5, z: 5 },
  },
});

// 初始化场景
sceneAPI.initScene(containerElement);

// 添加对象
sceneAPI.add(mesh);

// 渲染
sceneAPI.render();
```

### 2. useThreeRenderer - 渲染器管理

提供渲染器的高级控制和性能监控功能。

```typescript
import { useThreeRenderer } from '@/composables/core/three';

const rendererAPI = useThreeRenderer(existingRenderer, {
  enableStats: true,
  targetFPS: 60,
  renderer: {
    antialias: true,
    shadowMapEnabled: true,
  },
});

// 开始渲染循环
rendererAPI.startRenderLoop();

// 渲染单帧
rendererAPI.render(scene, camera);

// 截图
const dataURL = rendererAPI.screenshot('png', 1);
```

### 3. useThreeCamera - 相机控制

支持透视相机和正交相机，提供动画和预设功能。

```typescript
import { useThreeCamera, CameraType } from '@/composables/core/three';

const cameraAPI = useThreeCamera(undefined, {
  type: CameraType.Perspective,
  perspective: {
    fov: 75,
    position: { x: 5, y: 5, z: 5 },
  },
  presets: [
    {
      name: 'Front',
      position: { x: 0, y: 0, z: 10 },
      target: { x: 0, y: 0, z: 0 },
    },
  ],
});

// 动画到指定位置
await cameraAPI.animateTo({ x: 10, y: 10, z: 10 });

// 应用预设
cameraAPI.setPreset(preset, true);

// 缩放到适合对象
cameraAPI.zoomToFit(model);
```

### 4. useThreeControls - 交互控制

提供轨道控制器和变换控制器的统一接口。

```typescript
import { useThreeControls, ControlsType } from '@/composables/core/three';

const controlsAPI = useThreeControls(camera, domElement, {
  type: ControlsType.Orbit,
  autoUpdate: true,
  orbit: {
    enableDamping: true,
    dampingFactor: 0.05,
  },
});

// 切换控制器类型
controlsAPI.switchControls(ControlsType.Transform, camera, domElement);

// 设置目标
controlsAPI.setTarget({ x: 0, y: 0, z: 0 });

// 保存和恢复状态
const state = controlsAPI.saveState();
controlsAPI.restoreState(state);
```

### 5. useModelLoader - 模型加载

支持多种模型格式的加载，包含缓存和进度监控。

```typescript
import { useModelLoader, ModelFormat } from '@/composables/core/three';

const loaderAPI = useModelLoader({
  enableCache: true,
  dracoDecoderPath: '/draco/',
  defaultOptions: {
    autoCenter: true,
    autoScale: true,
    targetSize: 3,
  },
});

// 加载单个模型
const model = await loaderAPI.loadModel('/models/example.glb', {
  format: ModelFormat.GLB,
  autoCenter: true,
});

// 批量加载
const models = await loaderAPI.loadMultipleModels([
  '/models/model1.glb',
  '/models/model2.fbx',
]);

// 获取模型信息
const info = loaderAPI.getModelInfo('/models/example.glb');
```

## 🔧 完整使用示例

```typescript
import {
  useThreeScene,
  useThreeRenderer,
  useThreeCamera,
  useThreeControls,
  useModelLoader,
  ControlsType,
  ModelFormat,
} from '@/composables/core/three';

export default function use3DEditor() {
  // 初始化所有模块
  const sceneAPI = useThreeScene();
  const rendererAPI = useThreeRenderer();
  const cameraAPI = useThreeCamera();
  const controlsAPI = useThreeControls();
  const loaderAPI = useModelLoader();

  const init3D = async (container: HTMLElement) => {
    // 1. 初始化场景
    sceneAPI.initScene(container);

    // 2. 设置渲染器
    rendererAPI.renderer.value = sceneAPI.renderer.value;

    // 3. 设置相机
    cameraAPI.camera.value = sceneAPI.camera.value;

    // 4. 设置控制器
    controlsAPI.switchControls(
      ControlsType.Orbit,
      sceneAPI.camera.value!,
      sceneAPI.renderer.value!.domElement,
    );

    // 5. 加载模型
    const model = await loaderAPI.loadModel('/models/example.glb');
    sceneAPI.add(model);

    // 6. 开始渲染
    const animate = () => {
      controlsAPI.update();
      rendererAPI.render(sceneAPI.scene.value!, sceneAPI.camera.value!);
      requestAnimationFrame(animate);
    };
    animate();
  };

  return {
    sceneAPI,
    rendererAPI,
    cameraAPI,
    controlsAPI,
    loaderAPI,
    init3D,
  };
}
```

## 🚀 特性

- **🛡️ 100% TypeScript** - 完整的类型安全
- **⚡ 性能优化** - shallowRef、缓存、帧率控制
- **📡 事件驱动** - 解耦的组件通信
- **🔧 高度可配置** - 丰富的配置选项
- **♻️ 资源管理** - 自动清理和内存管理
- **🧪 易于测试** - 纯函数设计

## 📚 文档

查看 `src/examples/CompleteRenderingExample.vue` 获取完整的使用示例。

## ⚠️ 注意事项

1. **Three.js 版本兼容性**: 本模块基于 Three.js 0.180.0+ 开发
2. **WebGL 支持**: 需要浏览器支持 WebGL
3. **资源清理**: 组件卸载时会自动清理资源，但建议手动调用 dispose()
4. **事件处理**: 使用事件总线进行模块间通信，避免直接依赖
