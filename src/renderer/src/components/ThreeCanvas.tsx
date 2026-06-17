import { useEffect, useRef } from 'react';
import SceneManager from '../three/scene';

function ThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);

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

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}

export default ThreeCanvas;
