import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

export function loadGLB(path: string, onProgress?: (ratio: number) => void): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    loader.load(path, resolve, (xhr) => {
      if (xhr.total > 0) onProgress?.(xhr.loaded / xhr.total);
    }, reject);
  });
}

export function applyModelToScene(modelPath: string, scene: THREE.Scene, onProgress?: (ratio: number) => void, onRemove?: (old: THREE.Group) => void): Promise<THREE.Group> {
  const oldModel = scene.getObjectByName('__model__');
  if (oldModel) {
    onRemove?.(oldModel as THREE.Group);
    scene.remove(oldModel);
    oldModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  return loadGLB(modelPath, onProgress).then((gltf) => {
    const model = gltf.scene;
    model.name = '__model__';
    model.scale.set(1, 1, 1);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const scale = 2 / maxDim;
      model.scale.set(scale, scale, scale);
    }

    model.position.sub(center.clone().multiply(model.scale));

    scene.add(model);
    return model;
  });
}
