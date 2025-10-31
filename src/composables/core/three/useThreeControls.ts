import type { BaseConfig } from '@/types/common';
import type {
  ControlsAPI,
  ControlsEventData,
  ControlsType,
  OrbitControlsConfig,
  TransformControlsConfig,
} from '@/types/three/controls';

import { onUnmounted, readonly, ref, shallowRef } from 'vue';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { useEventBus } from '@/services/events/EventBus';
import { ControlsType as ControlsDataType } from '@/types/three/controls';

/** useThreeControls 配置选项 */
export interface UseThreeControlsOptions extends BaseConfig {
  /** 是否自动更新 */
  autoUpdate?: boolean;
  /** 轨道控制器配置 */
  orbit?: Partial<OrbitControlsConfig>;
  /** 变换控制器配置 */
  transform?: Partial<TransformControlsConfig>;
  /** 初始控制器类型 */
  type?: ControlsType;
}

/**
 * Three.js 控制器管理 Composable
 *
 * 功能特性：
 * - 轨道控制器（OrbitControls）
 * - 变换控制器（TransformControls）
 * - 控制器状态管理和事件处理
 * - 自动更新和状态保存
 * - 多种控制模式切换
 *
 * @param camera 相机实例
 * @param domElement DOM 元素
 * @param options 配置选项
 * @returns ControlsAPI 控制器管理接口
 */
export function useThreeControls(
  camera?: THREE.Camera,
  domElement?: HTMLElement,
  options: UseThreeControlsOptions = {},
): ControlsAPI {
  // 控制器实例
  const controlsRef = shallowRef<any>(null);

  // 状态管理
  const type = ref<ControlsType>(options.type || ControlsDataType.Orbit);
  const enabled = ref(true);
  const target = ref(new THREE.Vector3(0, 0, 0));

  // 事件总线
  const eventBus = useEventBus();

  // 默认配置
  const defaultOrbitConfig: OrbitControlsConfig = {
    autoRotate: false,
    autoRotateSpeed: 2,
    dampingFactor: 0.05,
    enableDamping: true,
    enablePan: true,
    enableRotate: true,
    enableZoom: true,
    maxAzimuthAngle: Infinity,
    maxDistance: Infinity,
    maxPolarAngle: Math.PI,
    minAzimuthAngle: -Infinity,
    minDistance: 0,
    minPolarAngle: 0,
  };

  const defaultTransformConfig: TransformControlsConfig = {
    mode: 'translate',
    showX: true,
    showY: true,
    showZ: true,
    size: 1,
    space: 'world',
  };

  /**
   * 创建轨道控制器
   */
  const createOrbitControls = (
    cam: THREE.Camera,
    element: HTMLElement,
    config: Partial<OrbitControlsConfig> = {},
  ): OrbitControls => {
    const cfg = { ...defaultOrbitConfig, ...options.orbit, ...config };
    const controls = new OrbitControls(cam, element);

    // 应用配置
    controls.enableZoom = cfg.enableZoom;
    controls.enableRotate = cfg.enableRotate;
    controls.enablePan = cfg.enablePan;
    controls.enableDamping = cfg.enableDamping;
    controls.dampingFactor = cfg.dampingFactor;
    controls.autoRotate = cfg.autoRotate;
    controls.autoRotateSpeed = cfg.autoRotateSpeed;
    controls.minDistance = cfg.minDistance;
    controls.maxDistance = cfg.maxDistance;
    controls.minPolarAngle = cfg.minPolarAngle;
    controls.maxPolarAngle = cfg.maxPolarAngle;
    controls.minAzimuthAngle = cfg.minAzimuthAngle;
    controls.maxAzimuthAngle = cfg.maxAzimuthAngle;

    // 设置目标
    controls.target.copy(target.value);

    // 设置事件监听器
    setupOrbitControlsEvents(controls);

    return controls;
  };

  /**
   * 创建变换控制器
   */
  const createTransformControls = (
    cam: THREE.Camera,
    element: HTMLElement,
    config: Partial<TransformControlsConfig> = {},
  ): TransformControls => {
    const cfg = { ...defaultTransformConfig, ...options.transform, ...config };
    const controls = new TransformControls(cam, element);

    // 应用配置
    controls.setMode(cfg.mode);
    controls.showX = cfg.showX;
    controls.showY = cfg.showY;
    controls.showZ = cfg.showZ;
    controls.setSize(cfg.size);
    controls.setSpace(cfg.space);

    // 设置事件监听器
    setupTransformControlsEvents(controls);

    return controls;
  };

  /**
   * 设置轨道控制器事件
   */
  const setupOrbitControlsEvents = (controls: OrbitControls): void => {
    controls.addEventListener('start', () => {
      const eventData: ControlsEventData['controls:start'] = {
        controls,
        type: ControlsDataType.Orbit,
      };
      eventBus.emit('controls:start', eventData);
    });

    controls.addEventListener('change', () => {
      // 更新目标位置
      target.value.copy(controls.target);

      const eventData: ControlsEventData['controls:change'] = {
        camera: controls.object as THREE.Camera,
        controls,
      };
      eventBus.emit('controls:change', eventData);
    });

    controls.addEventListener('end', () => {
      const eventData: ControlsEventData['controls:end'] = {
        camera: controls.object as THREE.Camera,
        controls,
      };
      eventBus.emit('controls:end', eventData);
    });
  };

  /**
   * 设置变换控制器事件
   */
  const setupTransformControlsEvents = (controls: TransformControls): void => {
    controls.addEventListener('dragging-changed', (event) => {
      // 当开始拖拽时禁用轨道控制器，结束时重新启用
      if (controlsRef.value && controlsRef.value !== controls) {
        controlsRef.value.enabled = !event.value;
      }
    });

    controls.addEventListener('change', () => {
      if (controls.object) {
        // 检测变换类型
        let property: 'position' | 'rotation' | 'scale';
        let value: THREE.Euler | THREE.Vector3;

        switch (controls.getMode()) {
          case 'rotate': {
            property = 'rotation';
            value = controls.object.rotation;
            break;
          }
          case 'scale': {
            property = 'scale';
            value = controls.object.scale;
            break;
          }
          case 'translate': {
            property = 'position';
            value = controls.object.position;
            break;
          }
          default: {
            return;
          }
        }

        const eventData: ControlsEventData['transform:objectChanged'] = {
          object: controls.object,
          property,
          value,
        };
        eventBus.emit('transform:objectChanged', eventData);
      }
    });
  };

  /**
   * 切换控制器类型
   */
  const switchControls = (
    newType: ControlsType,
    cam: THREE.Camera,
    element: HTMLElement,
  ): void => {
    // 清理现有控制器
    if (controlsRef.value) {
      controlsRef.value.dispose();
    }

    // 创建新控制器
    let newControls: any;
    switch (newType) {
      case ControlsDataType.Orbit: {
        newControls = createOrbitControls(cam, element);
        break;
      }
      case ControlsDataType.Transform: {
        newControls = createTransformControls(cam, element);
        break;
      }
      default: {
        throw new Error(`Unsupported controls type: ${newType}`);
      }
    }

    controlsRef.value = newControls;
    type.value = newType;

    if (options.debug) {
      console.warn(`[useThreeControls] Switched to ${newType}`);
    }
  };

  /**
   * 设置目标位置
   */
  const setTarget = (newTarget: THREE.Vector3Like): void => {
    target.value.set(newTarget.x ?? 0, newTarget.y ?? 0, newTarget.z ?? 0);

    if (controlsRef.value && controlsRef.value.target) {
      controlsRef.value.target.copy(target.value);
      controlsRef.value.update();
    }
  };

  /**
   * 启用/禁用控制器
   */
  const setEnabled = (isEnabled: boolean): void => {
    enabled.value = isEnabled;

    if (controlsRef.value) {
      controlsRef.value.enabled = isEnabled;
    }
  };

  /**
   * 更新控制器
   */
  const update = (): void => {
    if (controlsRef.value && controlsRef.value.update) {
      controlsRef.value.update();
    }
  };

  /**
   * 重置控制器
   */
  const reset = (): void => {
    if (controlsRef.value && controlsRef.value.reset) {
      controlsRef.value.reset();
    } else if (controlsRef.value && type.value === ControlsDataType.Orbit) {
      // 轨道控制器没有 reset 方法，手动重置
      controlsRef.value.target.set(0, 0, 0);
      controlsRef.value.object.position.set(0, 2, 6);
      controlsRef.value.update();
    }

    target.value.set(0, 0, 0);
  };

  /**
   * 保存控制器状态
   */
  const saveState = (): any => {
    if (!controlsRef.value) return null;

    const state: any = {
      target: target.value.clone(),
      type: type.value,
    };

    if (type.value === ControlsDataType.Orbit) {
      state.position = controlsRef.value.object.position.clone();
      state.zoom = controlsRef.value.object.zoom || 1;
    } else if (
      type.value === ControlsDataType.Transform &&
      controlsRef.value.object
    ) {
      state.object = {
        position: controlsRef.value.object.position.clone(),
        rotation: controlsRef.value.object.rotation.clone(),
        scale: controlsRef.value.object.scale.clone(),
      };
      state.mode = controlsRef.value.getMode();
    }

    return state;
  };

  /**
   * 恢复控制器状态
   */
  const restoreState = (state: any): void => {
    if (!state || !controlsRef.value) return;

    // 恢复目标
    if (state.target) {
      setTarget(state.target);
    }

    if (type.value === ControlsDataType.Orbit && state.position) {
      controlsRef.value.object.position.copy(state.position);
      if (state.zoom !== undefined) {
        controlsRef.value.object.zoom = state.zoom;
        controlsRef.value.object.updateProjectionMatrix();
      }
      controlsRef.value.update();
    } else if (type.value === ControlsDataType.Transform && state.object) {
      if (controlsRef.value.object) {
        controlsRef.value.object.position.copy(state.object.position);
        controlsRef.value.object.rotation.copy(state.object.rotation);
        controlsRef.value.object.scale.copy(state.object.scale);
      }
      if (state.mode) {
        controlsRef.value.setMode(state.mode);
      }
    }
  };

  /**
   * 清理资源
   */
  const dispose = (): void => {
    if (controlsRef.value) {
      controlsRef.value.dispose();
      controlsRef.value = null;
    }

    enabled.value = true;
    target.value.set(0, 0, 0);

    if (options.debug) {
      console.warn('[useThreeControls] Resources disposed');
    }
  };

  // 如果提供了相机和DOM元素，则立即创建控制器
  if (camera && domElement) {
    switchControls(type.value, camera, domElement);
  }

  // 自动更新（如果启用）
  if (options.autoUpdate !== false) {
    const updateLoop = () => {
      update();
      requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    dispose();
  });

  return {
    // 状态 (只读)
    controls: readonly(controlsRef),
    // 方法
    createOrbitControls,
    createTransformControls,
    dispose,

    enabled: readonly(enabled),
    reset,
    restoreState,
    saveState,
    setEnabled,
    setTarget,
    switchControls,
    target: readonly(target),
    type: readonly(type),
    update,
  };
}
