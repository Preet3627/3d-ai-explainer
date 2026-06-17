import * as THREE from 'three';

class AnnotationSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private highlightMeshes: THREE.Mesh[] = [];
  private originalEmissive: Map<THREE.Mesh, number> = new Map();
  private labelSprite: THREE.Sprite | null = null;
  private spotlight: THREE.SpotLight | null = null;
  private spotlightTarget: THREE.Object3D | null = null;
  private spotAnimId: number | null = null;
  private glowAnimId: number | null = null;

  private annotationLabel: HTMLDivElement | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  private findModelMeshes(): THREE.Mesh[] {
    const model = this.scene.getObjectByName('__model__');
    if (!model) return [];
    const meshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  highlightModel(color = 0x00ccff, intensity = 0.8): void {
    this.clearHighlight();
    const meshes = this.findModelMeshes();
    if (meshes.length === 0) return;

    this.highlightMeshes = meshes;
    for (const mesh of meshes) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat && mat.emissive) {
        this.originalEmissive.set(mesh, mat.emissive.getHex());
        mat.emissive.setHex(color);
        mat.emissiveIntensity = intensity;
      }
    }

    this.startGlowPulse(color);
  }

  clearHighlight(): void {
    if (this.glowAnimId !== null) {
      cancelAnimationFrame(this.glowAnimId);
      this.glowAnimId = null;
    }
    for (const mesh of this.highlightMeshes) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat && mat.emissive) {
        const original = this.originalEmissive.get(mesh);
        if (original !== undefined) {
          mat.emissive.setHex(original);
          mat.emissiveIntensity = 0;
        }
      }
    }
    this.highlightMeshes = [];
    this.originalEmissive.clear();
  }

  private startGlowPulse(color: number): void {
    let direction = 1;
    let value = 0.3;
    const step = 0.008;

    const animate = () => {
      value += step * direction;
      if (value > 0.8) direction = -1;
      if (value < 0.2) direction = 1;

      for (const mesh of this.highlightMeshes) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (mat && mat.emissive) {
          mat.emissiveIntensity = value;
        }
      }
      this.glowAnimId = requestAnimationFrame(animate);
    };
    animate();
  }

  showLabel(text: string): void {
    this.removeLabel();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 204, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxChars = 40;
    const displayText = text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.labelSprite = new THREE.Sprite(material);
    this.labelSprite.scale.set(3, 0.75, 1);
    this.labelSprite.position.set(0, 2.5, 0);
    this.scene.add(this.labelSprite);
  }

  removeLabel(): void {
    if (this.labelSprite) {
      this.scene.remove(this.labelSprite);
      (this.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.labelSprite.material as THREE.SpriteMaterial).dispose();
      this.labelSprite = null;
    }
  }

  startSpotlight(): void {
    this.stopSpotlight();

    this.spotlight = new THREE.SpotLight(0x00ccff, 8, 15, Math.PI / 6, 0.4, 1);
    this.spotlight.position.set(4, 6, 0);
    this.scene.add(this.spotlight);

    this.spotlightTarget = new THREE.Object3D();
    this.spotlightTarget.position.set(0, 0, 0);
    this.scene.add(this.spotlightTarget);
    this.spotlight.target = this.spotlightTarget;

    const helper = new THREE.SpotLightHelper(this.spotlight, 0x00ccff);
    this.scene.add(helper);

    let angle = 0;
    const radius = 5;
    const animate = () => {
      if (!this.spotlight) return;
      angle += 0.008;
      this.spotlight.position.x = Math.cos(angle) * radius;
      this.spotlight.position.z = Math.sin(angle) * radius;
      this.spotlight.position.y = 4 + Math.sin(angle * 2) * 1.5;
      this.spotAnimId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopSpotlight(): void {
    if (this.spotAnimId !== null) {
      cancelAnimationFrame(this.spotAnimId);
      this.spotAnimId = null;
    }
    if (this.spotlight) {
      this.scene.remove(this.spotlight);
      this.spotlight = null;
    }
    if (this.spotlightTarget) {
      this.scene.remove(this.spotlightTarget);
      this.spotlightTarget = null;
    }
  }

  pauseAutoRotate(): void {
    const controls = (this as any).controls;
    if (controls) controls.autoRotate = false;
  }

  resumeAutoRotate(): void {
    const controls = (this as any).controls;
    if (controls) controls.autoRotate = true;
  }

  clearAll(): void {
    this.clearHighlight();
    this.removeLabel();
    this.stopSpotlight();
  }

  dispose(): void {
    this.clearAll();
  }
}

export default AnnotationSystem;
