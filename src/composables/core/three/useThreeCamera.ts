import type { Ref } from 'vue';

import type { BaseConfig } from '@/types/common';
import type {
  CameraAnimationConfig,
  CameraAPI,
  CameraEventData,
  CameraPreset,
  CameraType,
  OrthographicCameraConfig,
  PerspectiveCameraConfig,
} from '@/types/three/camera';

import { onUnmounted, readonly, ref, shallowRef } from 'vue';

import * as THREE from 'three';

import { useEventBus } from '@/services/events/EventBus';
import { CameraType as CameraDataType } from '@/types/three/camera';

/** useThreeCamera 配置选项 */
export interface UseThreeCameraOptions extends BaseConfig {
  /** 正交相机配置 */
  orthographic?: Partial<OrthographicCameraConfig>;
  /** 透视相机配置 */
  perspective?: Partial<PerspectiveCameraConfig>;
  /** 预设相机位置 */
  presets?: CameraPreset[];
  /** 初始相机类型 */
  type?: CameraType;
}

/**
 * Three.js 相机管理 Composable
 *
 * 功能特性：
 * - 透视相机和正交相机支持
 * - 相机动画和平滑过渡
 * - 相机预设管理
 * - 自动适配和缩放
 * - 事件驱动的相机控制
 *
 * @param camera 已存在的相机实例
 * @param options 配置选项
 * @returns CameraAPI 相机管理接口
 */
export function useThreeCamera(
  camera?: THREE.Camera,
  options: UseThreeCameraOptions = {},
): CameraAPI {
  // 相机实例
  const cameraRef = shallowRef<null | THREE.Camera>(camera || null);

  // 状态管理
  const type = ref<CameraType>(options.type || CameraDataType.Perspective);
  const isAnimating = ref(false);
  const currentPreset = ref<CameraPreset | null>(null);

  // 动画控制
  let animationId: null | number = null;

  // 事件总线
  const eventBus = useEventBus();

  // 默认配置
  const defaultPerspectiveConfig: PerspectiveCameraConfig = {
    aspect: 1,
    far: 1000,
    fov: 75,
    near: 0.1,
    position: { x: 0, y: 2, z: 6 },
    target: { x: 0, y: 0, z: 0 },
  };

  const defaultOrthographicConfig: OrthographicCameraConfig = {
    bottom: -10,
    far: 1000,
    left: -10,
    near: 0.1,
    position: { x: 0, y: 2, z: 6 },
    right: 10,
    target: { x: 0, y: 0, z: 0 },
    top: 10,
  };

  /**
   * 创建透视相机
   */
  const createPerspectiveCamera = (
    config: Partial<PerspectiveCameraConfig> = {},
  ): THREE.PerspectiveCamera => {
    const cfg = {
      ...defaultPerspectiveConfig,
      ...options.perspective,
      ...config,
    };

    const camera = new THREE.PerspectiveCamera(
      cfg.fov,
      cfg.aspect,
      cfg.near,
      cfg.far,
    );

    camera.position.set(
      cfg.position.x ?? 0,
      cfg.position.y ?? 2,
      cfg.position.z ?? 6,
    );
    camera.lookAt(cfg.target.x ?? 0, cfg.target.y ?? 0, cfg.target.z ?? 0);

    return camera;
  };

  /**
   * 创建正交相机
   */
  const createOrthographicCamera = (
    config: Partial<OrthographicCameraConfig> = {},
  ): THREE.OrthographicCamera => {
    const cfg = {
      ...defaultOrthographicConfig,
      ...options.orthographic,
      ...config,
    };

    const camera = new THREE.OrthographicCamera(
      cfg.left,
      cfg.right,
      cfg.top,
      cfg.bottom,
      cfg.near,
      cfg.far,
    );

    camera.position.set(
      cfg.position.x ?? 0,
      cfg.position.y ?? 2,
      cfg.position.z ?? 6,
    );
    camera.lookAt(cfg.target.x ?? 0, cfg.target.y ?? 0, cfg.target.z ?? 0);

    return camera;
  };

  /**
   * 切换相机类型
   */
  const switchCamera = (newType: CameraType, config?: any): void => {
    if (!cameraRef.value) return;

    // 保存当前相机的位置和朝向
    const currentPosition = cameraRef.value.position.clone();
    const currentTarget = new THREE.Vector3();
    cameraRef.value.getWorldDirection(currentTarget);
    currentTarget.multiplyScalar(-1).add(currentPosition);

    const newCamera: THREE.Camera =
      newType === CameraDataType.Perspective
        ? createPerspectiveCamera({
            ...config,
            position: currentPosition,
            target: currentTarget,
          })
        : createOrthographicCamera({
            ...config,
            position: currentPosition,
            target: currentTarget,
          });

    cameraRef.value = newCamera;
    type.value = newType;

    if (options.debug) {
      console.warn(`[useThreeCamera] Switched to ${newType}`);
    }
  };

  /**
   * 更新宽高比
   */
  const updateAspect = (aspect: number): void => {
    if (!cameraRef.value) return;

    if (cameraRef.value instanceof THREE.PerspectiveCamera) {
      cameraRef.value.aspect = aspect;
      cameraRef.value.updateProjectionMatrix();
    } else if (cameraRef.value instanceof THREE.OrthographicCamera) {
      const height = cameraRef.value.top - cameraRef.value.bottom;
      const width = height * aspect;

      cameraRef.value.left = -width / 2;
      cameraRef.value.right = width / 2;
      cameraRef.value.updateProjectionMatrix();
    }
  };

  /**
   * 设置相机位置
   */
  const setPosition = (position: THREE.Vector3Like, animate = false): void => {
    if (!cameraRef.value) return;

    const targetPosition = new THREE.Vector3(
      position.x ?? 0,
      position.y ?? 0,
      position.z ?? 0,
    );

    if (animate) {
      animateTo(targetPosition);
    } else {
      cameraRef.value.position.copy(targetPosition);

      const eventData: CameraEventData['camera:moved'] = {
        camera: cameraRef.value,
        position: targetPosition,
        target: new THREE.Vector3(), // 这里需要计算当前目标
      };
      eventBus.emit('camera:moved', eventData);
    }
  };

  /**
   * 设置相机朝向
   */
  const lookAt = (target: THREE.Vector3Like, animate = false): void => {
    if (!cameraRef.value) return;

    const targetVector = new THREE.Vector3(
      target.x ?? 0,
      target.y ?? 0,
      target.z ?? 0,
    );

    if (animate) {
      animateTo(cameraRef.value.position, targetVector);
    } else {
      cameraRef.value.lookAt(targetVector);

      const eventData: CameraEventData['camera:rotated'] = {
        camera: cameraRef.value,
        rotation: cameraRef.value.rotation,
      };
      eventBus.emit('camera:rotated', eventData);
    }
  };

  /**
   * 动画到指定位置
   */
  const animateTo = (
    position: THREE.Vector3Like,
    target?: THREE.Vector3Like,
    config: Partial<CameraAnimationConfig> = {},
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!cameraRef.value || isAnimating.value) {
        resolve();
        return;
      }

      const camera = cameraRef.value;
      const startPosition = camera.position.clone();
      const endPosition = new THREE.Vector3(
        position.x ?? 0,
        position.y ?? 0,
        position.z ?? 0,
      );

      let startTarget: null | THREE.Vector3 = null;
      let endTarget: null | THREE.Vector3 = null;

      if (target) {
        startTarget = new THREE.Vector3();
        camera.getWorldDirection(startTarget);
        startTarget.multiplyScalar(-1).add(startPosition);
        endTarget = new THREE.Vector3(
          target.x ?? 0,
          target.y ?? 0,
          target.z ?? 0,
        );
      }

      const duration = config.duration || 1000;
      const startTime = performance.now();

      isAnimating.value = true;

      // 发送动画开始事件
      const startEventData: CameraEventData['camera:animationStart'] = {
        camera,
        from: startPosition,
        to: endPosition,
      };
      eventBus.emit('camera:animationStart', startEventData);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 应用缓动函数
        let easedProgress = progress;
        switch (config.easing) {
          case 'easeIn': {
            easedProgress = progress * progress;
            break;
          }
          case 'easeInOut': {
            easedProgress =
              progress < 0.5
                ? 2 * progress * progress
                : 1 - (-2 * progress + 2) ** 2 / 2;
            break;
          }
          case 'easeOut': {
            easedProgress = 1 - (1 - progress) * (1 - progress);
            break;
          }
          default: {
            easedProgress = progress;
          }
        }

        // 插值位置
        camera.position.lerpVectors(startPosition, endPosition, easedProgress);

        // 插值目标（如果有）
        if (startTarget && endTarget) {
          const currentTarget = new THREE.Vector3();
          currentTarget.lerpVectors(startTarget, endTarget, easedProgress);
          camera.lookAt(currentTarget);
        }

        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          // 动画完成
          isAnimating.value = false;
          animationId = null;

          // 发送动画结束事件
          const endEventData: CameraEventData['camera:animationEnd'] = {
            camera,
            position: endPosition,
          };
          eventBus.emit('camera:animationEnd', endEventData);

          config.onComplete?.();
          resolve();
        }
      };

      animationId = requestAnimationFrame(animate);
    });
  };

  /**
   * 设置相机预设
   */
  const setPreset = (preset: CameraPreset, animate = true): void => {
    if (!cameraRef.value) return;

    currentPreset.value = preset;

    if (animate) {
      animateTo(preset.position, preset.target);
    } else {
      cameraRef.value.position.set(
        preset.position.x ?? 0,
        preset.position.y ?? 0,
        preset.position.z ?? 0,
      );
      cameraRef.value.lookAt(
        preset.target.x ?? 0,
        preset.target.y ?? 0,
        preset.target.z ?? 0,
      );
    }

    // 应用 FOV（如果是透视相机）
    if (preset.fov && cameraRef.value instanceof THREE.PerspectiveCamera) {
      cameraRef.value.fov = preset.fov;
      cameraRef.value.updateProjectionMatrix();
    }

    const eventData: CameraEventData['camera:presetChanged'] = {
      camera: cameraRef.value,
      preset,
    };
    eventBus.emit('camera:presetChanged', eventData);

    if (options.debug) {
      console.warn(`[useThreeCamera] Applied preset: ${preset.name}`);
    }
  };

  /**
   * 保存当前位置为预设
   */
  const savePreset = (name: string): CameraPreset => {
    if (!cameraRef.value) {
      throw new Error('Camera not initialized');
    }

    const target = new THREE.Vector3();
    cameraRef.value.getWorldDirection(target);
    target.multiplyScalar(-1).add(cameraRef.value.position);

    const preset: CameraPreset = {
      fov:
        cameraRef.value instanceof THREE.PerspectiveCamera
          ? cameraRef.value.fov
          : undefined,
      name,
      position: cameraRef.value.position.clone(),
      target,
    };

    return preset;
  };

  /**
   * 缩放到适合对象
   */
  const zoomToFit = (object: THREE.Object3D, margin = 1.2): void => {
    if (!cameraRef.value) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize * margin;

    if (cameraRef.value instanceof THREE.PerspectiveCamera) {
      const fov = cameraRef.value.fov * (Math.PI / 180);
      const cameraDistance = distance / (2 * Math.tan(fov / 2));

      const direction = cameraRef.value.position
        .clone()
        .sub(center)
        .normalize();
      const newPosition = center
        .clone()
        .add(direction.multiplyScalar(cameraDistance));

      animateTo(newPosition, center);
    } else if (cameraRef.value instanceof THREE.OrthographicCamera) {
      cameraRef.value.left = -distance;
      cameraRef.value.right = distance;
      cameraRef.value.top = distance;
      cameraRef.value.bottom = -distance;
      cameraRef.value.updateProjectionMatrix();

      animateTo(center.clone().add(new THREE.Vector3(0, 0, distance)), center);
    }
  };

  /**
   * 清理资源
   */
  const dispose = (): void => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    isAnimating.value = false;
    currentPreset.value = null;
    cameraRef.value = null;

    if (options.debug) {
      console.warn('[useThreeCamera] Resources disposed');
    }
  };

  // 如果没有提供相机，则创建默认相机
  if (!cameraRef.value) {
    cameraRef.value =
      type.value === CameraDataType.Perspective
        ? createPerspectiveCamera()
        : createOrthographicCamera();
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    dispose();
  });

  return {
    animateTo,
    // 状态 (只读)
    camera: readonly(cameraRef) as Readonly<Ref<null | THREE.Camera>>,
    createOrthographicCamera,
    // 方法
    createPerspectiveCamera,

    currentPreset: readonly(currentPreset),
    dispose,
    isAnimating: readonly(isAnimating),
    lookAt,
    savePreset,
    setPosition,
    setPreset,
    switchCamera,
    type: readonly(type),
    updateAspect,
    zoomToFit,
  };
}
