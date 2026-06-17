import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { applyModelToScene } from './modelLoader';
import AnnotationSystem from './annotationSystem';

class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private cube: THREE.Mesh | null = null;
  private startTime: number;
  private objects: THREE.Object3D[] = [];
  private modelLoadCallbacks: Array<(path: string) => void> = [];
  private annotations: AnnotationSystem;
  private hasModel = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.startTime = Date.now();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.set(3, 2, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 2.0;
    this.controls.target.set(0, 0, 0);

    this.setupLighting();
    this.setupHelpers();
    this.addPlaceholderCube();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    this.annotations = new AnnotationSystem(this.scene, this.camera, this.renderer);

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);
    this.objects.push(ambient);

    const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x362d59, 0.6);
    this.scene.add(hemisphere);
    this.objects.push(hemisphere);

    const main = new THREE.DirectionalLight(0xffeedd, 2.0);
    main.position.set(5, 8, 5);
    main.castShadow = true;
    this.scene.add(main);
    this.objects.push(main);

    const fill = new THREE.DirectionalLight(0x4488ff, 0.4);
    fill.position.set(-3, 1, -4);
    this.scene.add(fill);
    this.objects.push(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, -2, 5);
    this.scene.add(rim);
    this.objects.push(rim);
  }

  private setupHelpers(): void {
    const grid = new THREE.GridHelper(10, 20, 0x444466, 0x222244);
    grid.position.y = -0.5;
    this.scene.add(grid);
    this.objects.push(grid);

    const axes = new THREE.AxesHelper(2);
    this.scene.add(axes);
    this.objects.push(axes);

    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 30;
    }
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({ color: 0x444466, size: 0.02, transparent: true, opacity: 0.6 }),
    );
    this.scene.add(particles);
    this.objects.push(particles);
  }

  private addPlaceholderCube(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6c63ff,
      metalness: 0.3,
      roughness: 0.4,
      clearcoat: 0.1,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);
    this.cube = cube;
    this.objects.push(cube);

    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.3 }),
    );
    cube.add(wireframe);
  }

  private update(): void {
    if (this.cube) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.cube.position.y = Math.sin(elapsed * 0.8) * 0.15;
    }
  }

  private animate(): void {
    this.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onModelLoaded(cb: (path: string) => void): void {
    this.modelLoadCallbacks.push(cb);
  }

  async loadModel(path: string, onProgress?: (ratio: number) => void): Promise<void> {
    this.annotations.clearAll();
    if (this.cube) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
      this.cube = null;
    }
    this.controls.autoRotate = true;
    await applyModelToScene(path, this.scene, onProgress);
    this.hasModel = true;
    this.modelLoadCallbacks.forEach((cb) => cb(path));
  }

  annotateExplanation(text: string): void {
    if (!this.hasModel) return;
    this.annotations.clearAll();
    this.annotations.highlightModel(0x00ccff, 0.8);
    this.annotations.showLabel(text);
    this.annotations.startSpotlight();
  }

  clearAnnotations(): void {
    this.annotations.clearAll();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.annotations.dispose();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    for (const obj of this.objects) {
      this.scene.remove(obj);
      if ('geometry' in obj && obj.geometry instanceof THREE.BufferGeometry) {
        obj.geometry.dispose();
      }
      if ('material' in obj && obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    }
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export default SceneManager;
