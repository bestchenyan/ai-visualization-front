<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import * as THREE from 'three';

import { useModelLoader, useThreeEngine } from '@/composables/core/three';
import { ModelFormat } from '@/types/three/loader';

// 容器引用
const containerRef = ref<HTMLElement>();

// 使用统一的 Three.js 引擎
const engine = useThreeEngine({
  autoRender: true,
  autoResize: true,
  controls: {
    autoRotate: false,
    dampingFactor: 0.05,
    enableDamping: true,
  },
  debug: true,
  renderer: {
    antialias: true,
    shadowMapEnabled: true,
    toneMappingExposure: 1.5,
  },
  scene: {
    backgroundColor: 0x2a_2a_2a,
    cameraPosition: { x: 5, y: 5, z: 5 },
    fov: 75,
  },
});

// 模型加载器（独立功能）
const loaderAPI = useModelLoader({
  debug: true,
  defaultOptions: {
    autoCenter: true,
    autoScale: true,
    targetSize: 3,
  },
  enableCache: true,
});

// UI 状态
const autoRotate = ref(false);
const showStats = ref(true);
const loadingModel = ref(false);

// 计算属性
const isInitialized = computed(() => engine.isInitialized.value);
const hasError = computed(() => !!engine.error.value);

// 预定义相机预设
const cameraPresets = [
  {
    name: 'Front',
    position: { x: 0, y: 0, z: 10 },
    target: { x: 0, y: 0, z: 0 },
  },
  {
    name: 'Side',
    position: { x: 10, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
  },
  {
    name: 'Top',
    position: { x: 0, y: 10, z: 0 },
    target: { x: 0, y: 0, z: 0 },
  },
  {
    name: 'Isometric',
    position: { x: 5, y: 5, z: 5 },
    target: { x: 0, y: 0, z: 0 },
  },
];

// 预定义模型列表
const modelList = [
  { format: ModelFormat.GLB, name: '立方体', url: '/models/cube.glb' },
];

// 已加载的模型
const loadedObjects = ref<THREE.Object3D[]>([]);

/**
 * 初始化 3D 引擎
 */
const initialize3D = async () => {
  if (!containerRef.value) {
    console.error('Container not found');
    return;
  }

  try {
    // 统一初始化引擎（包含场景、渲染器、相机、控制器）
    await engine.initialize(containerRef.value);

    // 添加辅助工具
    setupHelpers();

    console.warn('3D 引擎初始化完成');
  } catch (error) {
    console.error('初始化失败:', error);
  }
};

/**
 * 设置辅助工具
 */
const setupHelpers = () => {
  if (!engine.scene.value) return;

  // 坐标轴辅助
  const axesHelper = new THREE.AxesHelper(5);
  engine.add(axesHelper);

  // 网格辅助
  const gridHelper = new THREE.GridHelper(20, 20, 0x44_44_44, 0x44_44_44);
  engine.add(gridHelper);
};

/**
 * 切换相机预设
 */
const switchCameraPreset = (presetName: string) => {
  const preset = cameraPresets.find((p) => p.name === presetName);
  if (!preset) return;

  engine.setCameraPosition(preset.position, true);
  engine.setCameraTarget(preset.target);
};

/**
 * 切换自动旋转
 */
const toggleAutoRotate = () => {
  engine.setAutoRotate(autoRotate.value);
};

/**
 * 加载模型
 */
const loadModel = async (modelInfo: (typeof modelList)[0]) => {
  if (!engine.scene.value) return;

  loadingModel.value = true;

  try {
    const model = await loaderAPI.loadModel(modelInfo.url, {
      autoCenter: true,
      autoScale: true,
      format: modelInfo.format,
      targetSize: 2,
    });

    // 设置模型属性
    model.name = modelInfo.name;
    model.castShadow = true;
    model.receiveShadow = true;

    // 随机位置
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 2;
    model.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

    // 添加到场景（使用引擎的统一接口）
    engine.add(model);
    loadedObjects.value.push(model);

    console.warn(`模型 ${modelInfo.name} 加载完成`);
  } catch (error) {
    console.error('加载模型失败:', error);
  } finally {
    loadingModel.value = false;
  }
};

/**
 * 创建基础几何体
 */
const createGeometry = (type: 'box' | 'sphere' | 'torus') => {
  if (!engine.scene.value) return;

  let geometry: THREE.BufferGeometry;

  switch (type) {
    case 'box': {
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    }
    case 'sphere': {
      geometry = new THREE.SphereGeometry(0.8, 32, 32);
      break;
    }
    case 'torus': {
      geometry = new THREE.TorusGeometry(0.8, 0.3, 16, 100);
      break;
    }
  }

  const material = new THREE.MeshPhongMaterial({
    color: Math.random() * 0xff_ff_ff,
    shininess: 100,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // 随机位置
  mesh.position.set(
    (Math.random() - 0.5) * 8,
    Math.random() * 3,
    (Math.random() - 0.5) * 8,
  );

  // 使用引擎的统一接口添加对象
  engine.add(mesh);
  loadedObjects.value.push(mesh);
};

/**
 * 清空场景
 */
const clearScene = () => {
  // 使用引擎的清空方法（会保留光源和辅助工具）
  engine.clear();
  loadedObjects.value = [];
};

/**
 * 截图
 */
const takeScreenshot = () => {
  try {
    const dataURL = engine.screenshot('png', 1);
    const link = document.createElement('a');
    link.download = `screenshot-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  } catch (error) {
    console.error('截图失败:', error);
  }
};

// 组件挂载时初始化
onMounted(() => {
  setTimeout(() => {
    initialize3D();
  }, 100);
});
</script>

<template>
  <div class="improved-rendering-example">
    <div class="header">
      <h2>改进的 3D 渲染示例</h2>
      <div class="status">
        <span
          :class="{
            'status-ok': isInitialized && !hasError,
            'status-error': hasError,
            'status-loading': !isInitialized && !hasError,
          }"
        >
          {{ hasError ? '错误' : isInitialized ? '已初始化' : '初始化中...' }}
        </span>
      </div>
    </div>

    <div class="main-layout">
      <!-- 控制面板 -->
      <div class="control-panel">
        <div class="panel-section">
          <h3>相机预设</h3>
          <div class="preset-buttons">
            <button
              v-for="preset in cameraPresets"
              :key="preset.name"
              @click="switchCameraPreset(preset.name)"
              class="preset-btn"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <div class="panel-section">
          <h3>渲染设置</h3>
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="autoRotate"
              @change="toggleAutoRotate"
            />
            自动旋转
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="showStats" />
            显示统计
          </label>
        </div>

        <div class="panel-section">
          <h3>创建几何体</h3>
          <div class="geometry-buttons">
            <button @click="createGeometry('box')" class="geometry-btn">
              立方体
            </button>
            <button @click="createGeometry('sphere')" class="geometry-btn">
              球体
            </button>
            <button @click="createGeometry('torus')" class="geometry-btn">
              圆环
            </button>
          </div>
        </div>

        <div class="panel-section">
          <h3>模型加载</h3>
          <div class="model-buttons">
            <button
              v-for="model in modelList"
              :key="model.name"
              @click="loadModel(model)"
              :disabled="loadingModel"
              class="model-btn"
            >
              {{ model.name }}
            </button>
          </div>

          <div v-if="loaderAPI.loading.value" class="loading-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${loaderAPI.progress.value.percentage}%` }"
              ></div>
            </div>
            <span class="progress-text">
              {{ Math.round(loaderAPI.progress.value.percentage) }}%
            </span>
          </div>
        </div>

        <div class="panel-section">
          <h3>操作</h3>
          <button @click="clearScene" class="action-btn">清空场景</button>
          <button @click="takeScreenshot" class="action-btn">截图</button>
        </div>
      </div>

      <!-- 3D 视口 -->
      <div class="viewport">
        <div ref="containerRef" class="canvas-container">
          <!-- Three.js 渲染器将被添加到这里 -->
        </div>

        <div v-if="hasError" class="error-overlay">
          <div class="error-message">
            <h4>渲染错误</h4>
            <p>{{ engine.error.value?.message }}</p>
            <button @click="initialize3D" class="retry-btn">重试</button>
          </div>
        </div>

        <div v-if="!isInitialized && !hasError" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>正在初始化 3D 引擎...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.improved-rendering-example {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
}

.header h2 {
  margin: 0;
  color: #ffffff;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-ok {
  color: #4caf50;
  font-weight: 500;
}

.status-error {
  color: #f44336;
  font-weight: 500;
}

.status-loading {
  color: #2196f3;
  font-weight: 500;
}

.main-layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

.control-panel {
  width: 300px;
  background: #2a2a2a;
  border-right: 1px solid #3a3a3a;
  overflow-y: auto;
  padding: 1rem;
}

.panel-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #3a3a3a;
}

.panel-section:last-child {
  border-bottom: none;
}

.panel-section h3 {
  margin: 0 0 1rem 0;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preset-buttons,
.geometry-buttons,
.model-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.preset-btn,
.geometry-btn,
.model-btn,
.action-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #4a4a4a;
  background: #3a3a3a;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.preset-btn:hover,
.geometry-btn:hover,
.model-btn:hover,
.action-btn:hover {
  background: #4a4a4a;
  border-color: #5a5a5a;
}

.preset-btn:disabled,
.geometry-btn:disabled,
.model-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats {
  font-size: 0.8rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #aaa;
}

.stat-value {
  color: #ffffff;
  font-weight: 500;
  font-family: monospace;
}

.action-btn {
  width: 100%;
  margin-bottom: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.checkbox-label input {
  accent-color: #007bff;
}

.loading-progress {
  margin-top: 1rem;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #3a3a3a;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #aaa;
}

.viewport {
  flex: 1;
  position: relative;
  background: #1a1a1a;
}

.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.error-overlay,
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.error-message {
  background: #2a2a2a;
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  max-width: 400px;
}

.error-message h4 {
  margin: 0 0 1rem 0;
  color: #f44336;
}

.error-message p {
  margin: 0 0 1rem 0;
  color: #ffffff;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading-overlay {
  color: #ffffff;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #3a3a3a;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
