import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import SceneManager from '../three/scene';

export interface ThreeCanvasProps {
  onLoadProgress?: (ratio: number) => void;
  onStatus?: (status: string) => void;
}

export interface ThreeCanvasHandle {
  loadModel: (path: string) => Promise<void>;
}

const VALID_EXTENSIONS = ['.glb', '.gltf'];

const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeCanvasProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const dragCounter = useRef(0);

  useImperativeHandle(ref, () => ({
    loadModel: (path: string) => sceneRef.current?.loadModel(path, props.onLoadProgress) ?? Promise.resolve(),
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new SceneManager(container);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    containerRef.current?.classList.remove('border-indigo-500');

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      props.onStatus?.(`Unsupported format: ${ext} (use .glb or .gltf)`);
      return;
    }

    const filePath = (file as any).path;
    if (!filePath) {
      props.onStatus?.('Error: file path unavailable');
      return;
    }

    props.onStatus?.(`Loading ${file.name}...`);
    sceneRef.current?.loadModel(filePath, props.onLoadProgress)
      .then(() => props.onStatus?.(`Loaded ${file.name}`))
      .catch((err) => props.onStatus?.(`Error: ${err.message}`));
  }, [props]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    containerRef.current?.classList.add('border-indigo-500');
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      containerRef.current?.classList.remove('border-indigo-500');
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('drop', handleDrop);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    return () => {
      el.removeEventListener('drop', handleDrop);
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragleave', handleDragLeave);
    };
  }, [handleDrop, handleDragOver, handleDragEnter, handleDragLeave]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full border-2 border-transparent transition-colors duration-200"
    />
  );
});

ThreeCanvas.displayName = 'ThreeCanvas';
export default ThreeCanvas;
