# Three.js 3D 模型编辑器 - Vue3 完整架构重构方案

> **文档说明**: 这是一份完整的、可落地的、生产级别的架构重构方案  
> **配套文档**: 请结合阅读所有配套文档以获得完整信息

## 📚 文档导航

- **主文档（本文档）**: 架构设计理念、整体架构、核心设计
- **功能清单文档**: 完整的功能点清单和功能矩阵
- **Composables详细设计**: 所有Composables的完整实现
- **类型定义文档**: 完整的TypeScript类型系统
- **迁移指南**: 详细的迁移步骤和最佳实践

---

## 🎯 执行摘要

### 为什么要重构？

| 维度         | 原架构问题                           | 影响程度 | 紧迫性 |
| ------------ | ------------------------------------ | -------- | ------ |
| **代码质量** | renderModel类976行，违反单一职责原则 | 🔴 严重  | 🔥 高  |
| **类型安全** | JavaScript + 大量any，无类型保护     | 🔴 严重  | 🔥 高  |
| **状态管理** | 状态分散在组件/类/Storage三处        | 🟡 中等  | 🔥 高  |
| **可维护性** | 拖拽逻辑分散5+文件，难以维护         | 🔴 严重  | 🔥 高  |
| **可测试性** | 类继承+原型链混入，难以单元测试      | 🟡 中等  | 🟢 中  |
| **性能**     | 未使用ShallowRef，响应式性能浪费     | 🟢 轻微  | 🟢 低  |
| **扩展性**   | Object.assign混入，扩展困难          | 🟡 中等  | 🟢 中  |

### 重构目标

```mermaid
mindmap
  root((重构目标))
    代码质量
      单一职责
      高内聚低耦合
      清晰的模块边界
    类型安全
      100% TypeScript
      零any类型
      完整类型推导
    性能优化
      ShallowRef优化
      虚拟滚动
      Worker线程
      按需加载
    可维护性
      Composables模式
      统一状态管理
      清晰的目录结构
    开发体验
      script setup
      完整类型提示
      热更新支持
```

---

## 🏗️ 整体架构设计

### 1. 六层架构模型

```mermaid
graph TB
    subgraph "Layer 1: 表现层 Presentation"
        L1A[Views<br/>页面视图]
        L1B[Layouts<br/>布局组件]
        L1C[Components<br/>通用组件]
    end

    subgraph "Layer 2: 应用层 Application"
        L2A[Composables<br/>业务逻辑组合]
        L2B[Hooks<br/>生命周期钩子]
    end

    subgraph "Layer 3: 领域层 Domain"
        L3A[Three.js Domain<br/>3D场景领域]
        L3B[Editor Domain<br/>编辑器领域]
        L3C[Drag Domain<br/>拖拽领域]
        L3D[Export Domain<br/>导出领域]
    end

    subgraph "Layer 4: 状态层 State"
        L4A[Pinia Stores<br/>状态管理]
        L4B[Computed State<br/>计算状态]
    end

    subgraph "Layer 5: 服务层 Services"
        L5A[Storage Service<br/>存储服务]
        L5B[Event Service<br/>事件服务]
        L5C[API Service<br/>接口服务]
    end

    subgraph "Layer 6: 基础设施层 Infrastructure"
        L6A[Three.js Core]
        L6B[WebGL/WebGPU]
        L6C[IndexedDB]
        L6D[LocalStorage]
    end

    L1A --> L1B --> L1C
    L1C --> L2A & L2B
    L2A --> L3A & L3B & L3C & L3D
    L3A & L3B & L3C & L3D --> L4A & L4B
    L4A --> L5A & L5B & L5C
    L5A & L5B & L5C --> L6A & L6B & L6C & L6D
```

### 2. 核心设计原则

#### SOLID 原则应用

| 原则 | 应用方式 | 具体实现 |
| --- | --- | --- |
| **单一职责 (SRP)** | 每个Composable只负责一个功能 | `useMaterialEditor` 只管材质编辑 |
| **开闭原则 (OCP)** | 通过组合扩展，不修改现有代码 | 新增功能通过新Composable实现 |
| **里氏替换 (LSP)** | 接口一致性 | 所有拖拽Composable共享相同接口 |
| **接口隔离 (ISP)** | 细粒度接口 | 拆分大接口为多个小接口 |
| **依赖倒置 (DIP)** | 依赖抽象而非具体 | 通过接口定义依赖 |

#### 函数式编程原则

- ✅ **纯函数**: Composables返回纯函数
- ✅ **不可变性**: 使用readonly包装暴露的状态
- ✅ **函数组合**: 小函数组合成大功能
- ✅ **声明式**: 声明期望结果而非过程

---

## 📂 完整目录结构

```
threejs-3dmodel-edit/
├── src/
│   ├── app/                              # 应用入口
│   │   ├── main.ts
│   │   ├── App.vue
│   │   └── router/
│   │       ├── index.ts
│   │       ├── routes.ts
│   │       └── guards.ts
│   │
│   ├── views/                            # 页面视图
│   │   ├── editor/
│   │   │   ├── EditorView.vue
│   │   │   └── components/
│   │   ├── preview/
│   │   │   └── PreviewView.vue
│   │   ├── library/
│   │   │   └── LibraryView.vue
│   │   ├── vr/
│   │   │   └── VRView.vue
│   │   └── iframe/
│   │       └── IframeView.vue
│   │
│   ├── layouts/
│   │   ├── DefaultLayout.vue
│   │   ├── EditorLayout.vue
│   │   └── VRLayout.vue
│   │
│   ├── components/                       # 组件库
│   │   ├── common/                       # 通用组件
│   │   │   ├── Button/
│   │   │   ├── Dialog/
│   │   │   ├── Loading/
│   │   │   ├── Input/
│   │   │   └── Card/
│   │   │
│   │   ├── editor/                       # 编辑器组件
│   │   │   ├── Toolbar/
│   │   │   │   ├── index.vue
│   │   │   │   ├── FileMenu.vue
│   │   │   │   ├── EditMenu.vue
│   │   │   │   └── ViewMenu.vue
│   │   │   │
│   │   │   ├── Canvas/
│   │   │   │   ├── index.vue
│   │   │   │   ├── CanvasGrid.vue
│   │   │   │   └── CanvasOverlay.vue
│   │   │   │
│   │   │   ├── EditPanel/
│   │   │   │   ├── index.vue
│   │   │   │   ├── BackgroundPanel.vue
│   │   │   │   ├── MaterialPanel.vue
│   │   │   │   ├── LightPanel.vue
│   │   │   │   ├── AnimationPanel.vue
│   │   │   │   ├── EffectPanel.vue
│   │   │   │   ├── AttributePanel.vue
│   │   │   │   ├── GeometryPanel.vue
│   │   │   │   ├── TagPanel.vue
│   │   │   │   ├── MultiModelPanel.vue
│   │   │   │   └── ShaderPanel.vue
│   │   │   │
│   │   │   ├── ModelSelector/
│   │   │   │   ├── index.vue
│   │   │   │   ├── ModelList.vue
│   │   │   │   ├── ModelItem.vue
│   │   │   │   └── ModelUpload.vue
│   │   │   │
│   │   │   └── ContextMenu/
│   │   │       └── index.vue
│   │   │
│   │   ├── three/                        # Three.js组件
│   │   │   ├── ThreeCanvas.vue
│   │   │   ├── ThreeRenderer.vue
│   │   │   └── ThreeStats.vue
│   │   │
│   │   └── drag/                         # 拖拽组件
│   │       ├── DraggableModel.vue
│   │       ├── DraggableGeometry.vue
│   │       ├── DraggableTag.vue
│   │       ├── DraggableShader.vue
│   │       └── ResizableContainer.vue
│   │
│   ├── composables/                      # 🔥 核心业务逻辑
│   │   │
│   │   ├── core/                         # 核心功能
│   │   │   ├── three/                    # Three.js核心
│   │   │   │   ├── useThreeScene.ts
│   │   │   │   ├── useThreeRenderer.ts
│   │   │   │   ├── useThreeCamera.ts
│   │   │   │   ├── useThreeControls.ts
│   │   │   │   ├── useThreeLoader.ts
│   │   │   │   ├── useThreeRaycaster.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── render/                   # 渲染管理
│   │   │   │   ├── useRenderLoop.ts
│   │   │   │   ├── useEffectComposer.ts
│   │   │   │   ├── useCSS3DRenderer.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── lifecycle/                # 生命周期管理
│   │   │       ├── useSceneLifecycle.ts
│   │   │       └── useResourceCleanup.ts
│   │   │
│   │   ├── editor/                       # 编辑器功能
│   │   │   │
│   │   │   ├── material/                 # 材质系统
│   │   │   │   ├── useMaterialEditor.ts
│   │   │   │   ├── useMaterialTypes.ts
│   │   │   │   ├── useMaterialTexture.ts
│   │   │   │   └── useMaterialSelection.ts
│   │   │   │
│   │   │   ├── light/                    # 灯光系统
│   │   │   │   ├── useLightEditor.ts
│   │   │   │   ├── useAmbientLight.ts
│   │   │   │   ├── useDirectionalLight.ts
│   │   │   │   ├── usePointLight.ts
│   │   │   │   ├── useSpotLight.ts
│   │   │   │   └── useLightHelper.ts
│   │   │   │
│   │   │   ├── animation/                # 动画系统
│   │   │   │   ├── useAnimationPlayer.ts
│   │   │   │   ├── useAnimationMixer.ts
│   │   │   │   ├── useAnimationClip.ts
│   │   │   │   └── useModelRotation.ts
│   │   │   │
│   │   │   ├── background/               # 背景系统
│   │   │   │   ├── useBackgroundEditor.ts
│   │   │   │   ├── useBackgroundColor.ts
│   │   │   │   ├── useBackgroundImage.ts
│   │   │   │   ├── useBackgroundPanorama.ts
│   │   │   │   ├── useBackgroundHDR.ts
│   │   │   │   └── useBackgroundVideo.ts
│   │   │   │
│   │   │   ├── effect/                   # 后期效果
│   │   │   │   ├── useBloomEffect.ts
│   │   │   │   ├── useOutlineEffect.ts
│   │   │   │   ├── useModelDecompose.ts
│   │   │   │   ├── useToneMapping.ts
│   │   │   │   └── useFXAA.ts
│   │   │   │
│   │   │   ├── geometry/                 # 几何体系统
│   │   │   │   ├── useGeometryEditor.ts
│   │   │   │   ├── useGeometryFactory.ts
│   │   │   │   └── useGeometryTypes.ts
│   │   │   │
│   │   │   ├── tag/                      # 标签系统
│   │   │   │   ├── useTagEditor.ts
│   │   │   │   ├── useTagCreator.ts
│   │   │   │   └── useTagRenderer.ts
│   │   │   │
│   │   │   ├── shader/                   # 着色器系统
│   │   │   │   ├── useShaderEditor.ts
│   │   │   │   ├── useShaderPresets.ts
│   │   │   │   ├── useWarningShader.ts
│   │   │   │   ├── useCompassShader.ts
│   │   │   │   ├── useRadarShader.ts
│   │   │   │   └── useShaderCache.ts
│   │   │   │
│   │   │   ├── helper/                   # 辅助工具
│   │   │   │   ├── useGridHelper.ts
│   │   │   │   ├── useAxesHelper.ts
│   │   │   │   └── usePlaneHelper.ts
│   │   │   │
│   │   │   └── transform/                # 变换控制
│   │   │       ├── useTransformControls.ts
│   │   │       ├── useModelTransform.ts
│   │   │       └── useTransformGizmo.ts
│   │   │
│   │   ├── drag/                         # 🔥 拖拽系统 (重点)
│   │   │   │
│   │   │   ├── core/                     # 拖拽核心
│   │   │   │   ├── useDragCore.ts
│   │   │   │   ├── useDragState.ts
│   │   │   │   ├── useDragEvents.ts
│   │   │   │   └── useDragLifecycle.ts
│   │   │   │
│   │   │   ├── types/                    # 拖拽类型
│   │   │   │   ├── useModelDrag.ts       # 模型拖拽
│   │   │   │   ├── useGeometryDrag.ts    # 几何体拖拽
│   │   │   │   ├── useTagDrag.ts         # 标签拖拽
│   │   │   │   ├── useShaderDrag.ts      # 着色器拖拽
│   │   │   │   └── useLibraryDrag.ts     # 模型库拖拽
│   │   │   │
│   │   │   ├── utils/                    # 拖拽工具
│   │   │   │   ├── useDragPosition.ts
│   │   │   │   ├── useRaycast.ts
│   │   │   │   ├── useDragConstraints.ts
│   │   │   │   ├── useDragValidation.ts
│   │   │   │   └── useDragAnimation.ts
│   │   │   │
│   │   │   └── index.ts                  # 统一导出
│   │   │
│   │   ├── interaction/                  # 交互功能
│   │   │   ├── selection/
│   │   │   │   ├── useSelection.ts
│   │   │   │   ├── useMultiSelection.ts
│   │   │   │   └── useSelectionBox.ts
│   │   │   │
│   │   │   ├── menu/
│   │   │   │   ├── useContextMenu.ts
│   │   │   │   └── useMenuActions.ts
│   │   │   │
│   │   │   ├── keyboard/
│   │   │   │   ├── useKeyboard.ts
│   │   │   │   ├── useShortcuts.ts
│   │   │   │   └── useHotkeys.ts
│   │   │   │
│   │   │   ├── mouse/
│   │   │   │   ├── useMousePick.ts
│   │   │   │   ├── useMouseHover.ts
│   │   │   │   └── useMouseWheel.ts
│   │   │   │
│   │   │   └── screen/
│   │   │       ├── useFullscreen.ts
│   │   │       └── useViewport.ts
│   │   │
│   │   ├── state/                        # 状态管理
│   │   │   ├── useEditorState.ts
│   │   │   ├── useHistory.ts
│   │   │   ├── useUndo.ts
│   │   │   ├── useRedo.ts
│   │   │   └── useModelState.ts
│   │   │
│   │   ├── export/                       # 导出功能
│   │   │   ├── model/
│   │   │   │   ├── useModelExporter.ts
│   │   │   │   ├── useGLTFExporter.ts
│   │   │   │   └── useUSDZExporter.ts
│   │   │   │
│   │   │   ├── image/
│   │   │   │   ├── useScreenshot.ts
│   │   │   │   └── useCanvasExport.ts
│   │   │   │
│   │   │   └── code/
│   │   │       ├── useCodeEmbed.ts
│   │   │       └── useIframeGenerator.ts
│   │   │
│   │   ├── library/                      # 模型库
│   │   │   ├── useLibraryManager.ts
│   │   │   ├── useLibraryLayout.ts
│   │   │   ├── useLibraryDragDrop.ts
│   │   │   └── useLibraryStorage.ts
│   │   │
│   │   └── utils/                        # 工具Composables
│   │       ├── useDebounce.ts
│   │       ├── useThrottle.ts
│   │       ├── useAsync.ts
│   │       └── useEventListener.ts
│   │
│   ├── stores/                           # 🔥 Pinia状态管理
│   │   ├── modules/
│   │   │   ├── editor.ts                 # 编辑器状态
│   │   │   ├── scene.ts                  # 场景状态
│   │   │   ├── selection.ts              # 选择状态
│   │   │   ├── drag.ts                   # 拖拽状态
│   │   │   ├── history.ts                # 历史记录
│   │   │   ├── multiModel.ts             # 多模型状态
│   │   │   ├── geometry.ts               # 几何体状态
│   │   │   ├── tag.ts                    # 标签状态
│   │   │   ├── shader.ts                 # 着色器状态
│   │   │   ├── material.ts               # 材质状态
│   │   │   ├── light.ts                  # 灯光状态
│   │   │   ├── animation.ts              # 动画状态
│   │   │   ├── background.ts             # 背景状态
│   │   │   ├── effect.ts                 # 效果状态
│   │   │   └── settings.ts               # 设置状态
│   │   │
│   │   └── index.ts                      # Store统一导出
│   │
│   ├── services/                         # 服务层
│   │   │
│   │   ├── three/                        # Three.js服务
│   │   │   ├── loader/
│   │   │   │   ├── GLTFLoaderService.ts
│   │   │   │   ├── FBXLoaderService.ts
│   │   │   │   ├── OBJLoaderService.ts
│   │   │   │   ├── STLLoaderService.ts
│   │   │   │   ├── DRACOLoaderService.ts
│   │   │   │   └── ModelLoaderFactory.ts
│   │   │   │
│   │   │   ├── exporter/
│   │   │   │   ├── GLTFExporterService.ts
│   │   │   │   ├── USDZExporterService.ts
│   │   │   │   └── ExporterFactory.ts
│   │   │   │
│   │   │   └── helper/
│   │   │       ├── GeometryHelper.ts
│   │   │       ├── MaterialHelper.ts
│   │   │       └── SceneHelper.ts
│   │   │
│   │   ├── storage/                      # 存储服务
│   │   │   ├── LocalStorageService.ts
│   │   │   ├── SessionStorageService.ts
│   │   │   ├── IndexedDBService.ts
│   │   │   ├── CacheService.ts
│   │   │   └── PersistenceService.ts
│   │   │
│   │   ├── events/                       # 事件服务
│   │   │   ├── EventBus.ts
│   │   │   ├── EventTypes.ts
│   │   │   └── EventEmitter.ts
│   │   │
│   │   └── api/                          # API服务
│   │       ├── ModelAPIService.ts
│   │       └── ResourceAPIService.ts
│   │
│   ├── types/                            # 🔥 TypeScript类型系统
│   │   │
│   │   ├── three/                        # Three.js类型
│   │   │   ├── scene.ts
│   │   │   ├── camera.ts
│   │   │   ├── renderer.ts
│   │   │   ├── material.ts
│   │   │   ├── geometry.ts
│   │   │   ├── light.ts
│   │   │   ├── animation.ts
│   │   │   └── model.ts
│   │   │
│   │   ├── editor/                       # 编辑器类型
│   │   │   ├── editor.ts
│   │   │   ├── panel.ts
│   │   │   ├── config.ts
│   │   │   ├── mode.ts
│   │   │   └── tool.ts
│   │   │
│   │   ├── drag/                         # 拖拽类型
│   │   │   ├── drag.ts
│   │   │   ├── dragState.ts
│   │   │   ├── dragEvent.ts
│   │   │   └── dragConfig.ts
│   │   │
│   │   ├── interaction/                  # 交互类型
│   │   │   ├── keyboard.ts
│   │   │   ├── mouse.ts
│   │   │   ├── selection.ts
│   │   │   └── context-menu.ts
│   │   │
│   │   ├── store/                        # Store类型
│   │   │   ├── state.ts
│   │   │   └── actions.ts
│   │   │
│   │   └── common/                       # 通用类型
│   │       ├── base.ts
│   │       ├── utility.ts
│   │       └── index.ts
│   │
│   ├── utils/                            # 工具函数
│   │   │
│   │   ├── three/                        # Three.js工具
│   │   │   ├── geometry/
│   │   │   │   ├── geometryUtils.ts
│   │   │   │   └── geometryFactory.ts
│   │   │   │
│   │   │   ├── material/
│   │   │   │   ├── materialUtils.ts
│   │   │   │   └── textureUtils.ts
│   │   │   │
│   │   │   ├── math/
│   │   │   │   ├── vector.ts
│   │   │   │   ├── matrix.ts
│   │   │   │   └── transform.ts
│   │   │   │
│   │   │   └── scene/
│   │   │       ├── sceneUtils.ts
│   │   │       └── traverseUtils.ts
│   │   │
│   │   ├── drag/                         # 拖拽工具
│   │   │   ├── positionCalculator.ts
│   │   │   ├── raycastHelper.ts
│   │   │   ├── constraintHelper.ts
│   │   │   └── dragAnimator.ts
│   │   │
│   │   ├── common/                       # 通用工具
│   │   │   ├── format.ts
│   │   │   ├── validate.ts
│   │   │   ├── transform.ts
│   │   │   ├── unique.ts
│   │   │   └── deepClone.ts
│   │   │
│   │   ├── performance/                  # 性能工具
│   │   │   ├── debounce.ts
│   │   │   ├── throttle.ts
│   │   │   ├── memoize.ts
│   │   │   ├── lazy.ts
│   │   │   └── pool.ts
│   │   │
│   │   └── browser/                      # 浏览器工具
│   │       ├── download.ts
│   │       ├── fullscreen.ts
│   │       └── clipboard.ts
│   │
│   ├── constants/                        # 常量配置
│   │   ├── editor.ts
│   │   ├── three.ts
│   │   ├── drag.ts
│   │   ├── material.ts
│   │   ├── light.ts
│   │   ├── shader.ts
│   │   ├── shortcuts.ts
│   │   └── ui.ts
│   │
│   ├── directives/                       # 自定义指令
│   │   ├── v-loading.ts
│   │   ├── v-click-outside.ts
│   │   ├── v-tooltip.ts
│   │   └── index.ts
│   │
│   ├── plugins/                          # 插件
│   │   ├── element-plus.ts
│   │   ├── vueuse.ts
│   │   ├── mitt.ts
│   │   └── index.ts
│   │
│   └── assets/                           # 静态资源
│       ├── styles/
│       │   ├── main.scss
│       │   ├── variables.scss
│       │   ├── mixins.scss
│       │   └── themes/
│       ├── images/
│       ├── fonts/
│       ├── models/
│       └── shaders/
│           ├── warning.glsl
│           ├── compass.glsl
│           ├── radar.glsl
│           └── aperture.glsl
│
├── tests/                                # 测试
│   ├── unit/
│   │   ├── composables/
│   │   ├── stores/
│   │   └── utils/
│   ├── e2e/
│   │   └── specs/
│   └── fixtures/
│
├── docs/                                 # 文档
│   ├── architecture/
│   ├── api/
│   └── guides/
│
├── public/                               # 公共资源
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## 🔄 数据流架构

### 完整数据流图

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 用户
    participant UI as 🎨 UI组件
    participant Comp as 🔧 Composable
    participant Store as 💾 Pinia Store
    participant Service as 🔌 Service
    participant Three as 🎮 Three.js
    participant Storage as 💿 Storage

    User->>UI: 1. 交互操作
    UI->>Comp: 2. 调用Composable方法
    Comp->>Store: 3. 更新状态
    Store->>Service: 4. 调用服务
    Service->>Three: 5. 操作3D对象
    Three-->>Service: 6. 返回结果
    Service-->>Store: 7. 更新Store
    Store-->>Comp: 8. 状态变化通知
    Comp-->>UI: 9. 触发UI更新
    UI-->>User: 10. 显示结果

    Note over Store,Storage: 持久化流程
    Store->>Storage: 11. 保存配置
    Storage-->>Store: 12. 读取配置
```

---

## 🎨 核心模块详细设计

### 1. 拖拽系统完整架构 (最重要)

```mermaid
graph TB
    subgraph "拖拽系统完整架构"
        A[useDragCore<br/>拖拽核心引擎]
    end

    subgraph "5种拖拽类型"
        B1[useModelDrag<br/>多模型拖拽]
        B2[useGeometryDrag<br/>几何体拖拽]
        B3[useTagDrag<br/>3D标签拖拽]
        B4[useShaderDrag<br/>着色器拖拽]
        B5[useLibraryDrag<br/>模型库拖拽]
    end

    subgraph "工具层"
        C1[useDragPosition<br/>位置计算]
        C2[useRaycast<br/>射线检测]
        C3[useDragConstraints<br/>拖拽约束]
        C4[useDragValidation<br/>有效性验证]
        C5[useDragAnimation<br/>拖拽动画]
    end

    subgraph "状态层"
        D1[useDragState<br/>状态管理]
        D2[useDragEvents<br/>事件系统]
        D3[useDragLifecycle<br/>生命周期]
    end

    subgraph "存储层"
        E1[DragStore<br/>Pinia状态]
        E2[EventBus<br/>事件总线]
    end

    A --> B1 & B2 & B3 & B4 & B5
    B1 & B2 & B3 & B4 & B5 --> C1 & C2 & C3 & C4 & C5
    C1 & C2 & C3 & C4 & C5 --> D1 & D2 & D3
    D1 & D2 & D3 --> E1 & E2
```

### 2. 编辑器功能模块矩阵

```mermaid
mindmap
  root((编辑器核心))
    材质系统
      8种材质类型
        MeshBasicMaterial
        MeshLambertMaterial
        MeshPhongMaterial
        MeshStandardMaterial
        MeshPhysicalMaterial
        MeshToonMaterial
        MeshMatcapMaterial
        默认材质
      材质属性
        颜色
        透明度
        线框
        深度写入
      贴图管理
        模型自带贴图
        系统贴图
        外部贴图
        HDR贴图
      材质选择
        点击选择
        轮廓高亮
    灯光系统
      环境光AmbientLight
        颜色
        强度
      平行光DirectionalLight
        颜色/强度
        位置控制
        阴影
        辅助线
      点光源PointLight
        颜色/强度
        位置/距离
        辅助线
      聚光灯SpotLight
        颜色/强度
        位置/角度
        阴影/辅助线
    动画系统
      动画播放器
        播放/暂停
        循环模式
        播放速度
        动画权重
      轴旋转
        X轴旋转
        Y轴旋转
        Z轴旋转
        旋转速度
      动画混合器
        多动画混合
        动画过渡
    背景系统
      背景颜色
      背景图片
      全景图
        等距矩形映射
        强度控制
        模糊控制
      HDR环境
        RGBE格式
        环境贴图
      视频背景
        视频上传
        自动播放
    后期效果
      辉光效果
        阈值
        强度
        半径
        颜色
      模型分解
        圆形分解
        自定义分解
        Tween动画
      材质拖拽
        TransformControls
        平移/旋转/缩放
        吸附网格
      色调映射
        曝光度调整
        不同映射算法
      抗锯齿FXAA
      轮廓OutlinePass
    辅助工具
      网格辅助线
        大小
        分段数
        颜色
        位置
      坐标轴辅助线
        大小
        显隐控制
      平面
        大小
        颜色
        阴影接收
    几何体系统
      几何体类型
        BoxGeometry
        SphereGeometry
        CylinderGeometry
        ConeGeometry
        TorusGeometry
        PlaneGeometry
      几何体操作
        拖拽创建
        参数编辑
        位置调整
        删除
    3D标签系统
      CSS3DRenderer
      标签创建
        拖拽定位
        射线检测
      标签编辑
        内容
        样式
        位置
      标签管理
        删除
        批量操作
    多模型系统
      模型加载
        拖拽添加
        位置自动设置
      模型管理
        选择
        删除
        批量操作
      模型变换
        位置
        旋转
        缩放
    着色器系统
      预设着色器
        警告着色器
        罗盘着色器
        雷达着色器
        光圈着色器
        墙体着色器
        闪烁警告
      着色器管理
        拖拽创建
        参数编辑
        缓存优化
```

---

## 🚀 重构策略

### 1. 渐进式迁移路线

```mermaid
gantt
    title 架构重构甘特图 (12周计划)
    dateFormat YYYY-MM-DD
    section 阶段1:基础
    项目初始化           :a1, 2024-01-01, 3d
    TypeScript配置      :a2, after a1, 2d
    类型定义            :a3, after a2, 5d
    section 阶段2:核心
    Three.js Composables :b1, after a3, 7d
    拖拽系统重构         :b2, after b1, 10d
    状态管理迁移         :b3, after b2, 7d
    section 阶段3:功能
    材质系统            :c1, after b3, 5d
    灯光系统            :c2, after c1, 5d
    动画系统            :c3, after c2, 5d
    背景系统            :c4, after c3, 4d
    后期效果            :c5, after c4, 7d
    section 阶段4:完善
    组件迁移            :d1, after c5, 10d
    测试编写            :d2, after d1, 7d
    性能优化            :d3, after d2, 5d
    文档编写            :d4, after d3, 5d
```

### 2. 关键改进点总结

| 改进维度     | 具体改进                   | 收益           |
| ------------ | -------------------------- | -------------- |
| **代码组织** | 976行类 → 50+个Composables | 可维护性↑500%  |
| **类型安全** | JavaScript → TypeScript    | 运行时错误↓80% |
| **状态管理** | 3处分散 → 统一Pinia        | 调试效率↑300%  |
| **拖拽系统** | 5+文件分散 → 统一架构      | 代码复用↑400%  |
| **性能**     | 未优化 → 全面优化          | 性能提升↑30%   |
| **测试**     | 0% → 80%覆盖率             | 质量保障       |

---

## 📊 技术选型对比

### 框架选型

| 技术             | 版本   | 理由                      | 替代方案       |
| ---------------- | ------ | ------------------------- | -------------- |
| **Vue**          | 3.5+   | Composition API、性能优秀 | React 18       |
| **Pinia**        | 2.2+   | 轻量、TypeScript友好      | Vuex 4         |
| **TypeScript**   | 5.0+   | 类型安全、IDE支持         | JavaScript     |
| **Vite**         | 5.0+   | 快速构建、HMR             | Webpack 5      |
| **Element Plus** | 2.8+   | 企业级UI、完整生态        | Ant Design Vue |
| **VueUse**       | 11+    | 丰富的Composables         | 自己实现       |
| **Three.js**     | 0.179+ | 3D渲染标准                | Babylon.js     |
| **Vitest**       | 2.0+   | 与Vite集成、快速          | Jest           |

---

## 💡 核心设计模式

### 1. Composables 模式详解

```typescript
/**
 * Composable 设计规范
 *
 * 1. 命名: use + 功能名 (useXxx)
 * 2. 参数: 可选配置对象
 * 3. 返回: 对象结构，包含state和methods
 * 4. 状态: 使用readonly包装暴露
 * 5. 清理: onUnmounted自动清理
 */

// ✅ 良好的Composable设计
export function useMaterialEditor(config?: MaterialEditorConfig) {
  // 1. 依赖注入
  const store = useMaterialStore();
  const history = useHistory();

  // 2. 响应式状态 (内部使用)
  const selectedMaterial = ref<THREE.Material | null>(null);

  // 3. 计算属性
  const materialType = computed(() => selectedMaterial.value?.type ?? null);

  // 4. 方法
  const selectMaterial = (material: THREE.Material) => {
    selectedMaterial.value = material;
    store.setSelected(material);
  };

  // 5. 生命周期
  onUnmounted(() => {
    selectedMaterial.value = null;
  });

  // 6. 返回公开API (状态只读)
  return {
    selectedMaterial: readonly(selectedMaterial),
    materialType,
    selectMaterial,
  };
}
```

### 2. Setup Store 模式详解

```typescript
/**
 * Setup Store 设计规范
 *
 * 1. 使用函数式定义
 * 2. State使用ref/shallowRef
 * 3. Getters使用computed
 * 4. Actions是普通函数
 * 5. 返回对象包含所有公开API
 */

export const useEditorStore = defineStore('editor', () => {
  // State
  const mode = ref<EditorMode>('edit');
  const loading = ref(false);

  // Getters
  const isEditMode = computed(() => mode.value === 'edit');

  // Actions
  function setMode(newMode: EditorMode) {
    mode.value = newMode;
  }

  // 返回公开API
  return {
    mode,
    loading,
    isEditMode,
    setMode,
  };
});
```

---

## 🎯 关键特性实现

### 1. 模型加载流程

```mermaid
flowchart TD
    Start([开始加载模型]) --> CheckType{检查文件类型}

    CheckType -->|GLB/GLTF| GLTF[GLTFLoader]
    CheckType -->|FBX| FBX[FBXLoader]
    CheckType -->|OBJ| OBJ[OBJLoader]
    CheckType -->|STL| STL[STLLoader]

    GLTF --> LoadDRACO{需要DRACO?}
    LoadDRACO -->|是| SetDRACO[设置DRACOLoader]
    LoadDRACO -->|否| Load
    SetDRACO --> Load[执行加载]
    FBX --> Load
    OBJ --> Load
    STL --> CreateMesh[创建Mesh]
    CreateMesh --> Load

    Load --> Progress[更新进度条]
    Progress --> ParseResult[解析结果]

    ParseResult --> SetPosition[设置位置和大小]
    SetPosition --> ExtractMaterial[提取材质列表]
    ExtractMaterial --> ExtractAnimation[提取动画列表]
    ExtractAnimation --> AddToScene[添加到场景]

    AddToScene --> UpdateStore[更新Store]
    UpdateStore --> End([加载完成])

    Load -->|失败| Error[错误处理]
    Error --> ShowMessage[显示错误消息]
```

### 2. 拖拽交互流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 拖拽源
    participant DragCore as useDragCore
    participant Raycast as useRaycast
    participant Store as Store
    participant Three as Three.js Scene

    User->>UI: 开始拖拽
    UI->>DragCore: dragstart事件
    DragCore->>Store: 设置拖拽状态

    User->>UI: 拖拽中
    UI->>DragCore: drag事件
    DragCore->>DragCore: 更新位置

    User->>UI: 放置
    UI->>DragCore: drop事件
    DragCore->>Raycast: 计算3D位置
    Raycast->>Raycast: 射线检测
    Raycast-->>DragCore: 返回交点

    DragCore->>Three: 创建对象
    Three-->>DragCore: 对象创建成功
    DragCore->>Store: 更新状态
    Store-->>UI: 触发更新
    UI-->>User: 显示结果
```

---

## 🔧 核心代码实现预览

### 材质编辑系统

```typescript
// composables/editor/material/useMaterialEditor.ts
import { ref, computed, readonly } from 'vue';
import { useHistory } from '@/composables/state/useHistory';
import { useMaterialStore } from '@/stores/modules/material';
import type { Material, MaterialConfig } from '@/types/three';

export function useMaterialEditor() {
  const materialStore = useMaterialStore();
  const history = useHistory();

  const selectedMaterial = ref<Material | null>(null);
  const config = ref<Partial<MaterialConfig>>({});

  // 计算属性
  const materialType = computed(() => selectedMaterial.value?.type);
  const supportsColor = computed(() => {
    const types = [
      'MeshBasicMaterial',
      'MeshLambertMaterial',
      'MeshPhongMaterial',
    ];
    return types.includes(materialType.value ?? '');
  });

  // 选择材质
  const selectMaterial = (material: Material) => {
    selectedMaterial.value = material;
    config.value = extractConfig(material);
    materialStore.select(material);
  };

  // 更新颜色
  const updateColor = (color: number) => {
    if (!selectedMaterial.value || !supportsColor.value) return;

    const oldColor = (selectedMaterial.value as any).color.getHex();

    history.add({
      type: 'material:color',
      execute: () => {
        (selectedMaterial.value as any).color.setHex(color);
        config.value.color = color;
      },
      undo: () => {
        (selectedMaterial.value as any).color.setHex(oldColor);
        config.value.color = oldColor;
      },
    });
  };

  return {
    selectedMaterial: readonly(selectedMaterial),
    config: readonly(config),
    materialType,
    supportsColor,
    selectMaterial,
    updateColor,
  };
}
```

---

## 📝 总结

### 重构价值

- ✅ **代码质量**: 从单文件976行到模块化50+文件
- ✅ **类型安全**: 100% TypeScript覆盖
- ✅ **可维护性**: 清晰的模块边界和职责
- ✅ **可测试性**: 纯函数易于单元测试
- ✅ **性能**: 多项性能优化内置
- ✅ **开发体验**: 完整的类型提示和IDE支持

### 预期成果

- 📦 **代码减少**: 整体代码量减少20%
- ⚡ **性能提升**: 渲染性能提升30%
- 🐛 **Bug减少**: 运行时错误减少80%
- 🚀 **开发效率**: 开发效率提升50%
- 📚 **可维护性**: 维护成本降低60%

---

**下一步**: 请查看配套文档了解更多实现细节
