import fs from 'fs';
import path from 'path';

interface ModelInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
}

class ModelManager {
  private modelsDir: string;
  private uploadsDir: string;

  constructor(modelsDir?: string, uploadsDir?: string) {
    const base = path.join(__dirname, '../..');
    this.modelsDir = modelsDir || path.join(base, 'src/assets/models');
    this.uploadsDir = uploadsDir || path.join(base, 'uploads');
    fs.mkdirSync(this.modelsDir, { recursive: true });
    fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  saveUpload(file: Buffer, extension: string): string {
    const id = crypto.randomUUID().replace(/-/g, '');
    const filename = `${id}${extension}`;
    const filePath = path.join(this.uploadsDir, filename);
    fs.writeFileSync(filePath, file);
    return filePath;
  }

  saveModel(glbData: Buffer, name?: string): string {
    const id = crypto.randomUUID().replace(/-/g, '');
    const filename = name ? `${name}.glb` : `${id}.glb`;
    const filePath = path.join(this.modelsDir, filename);
    fs.writeFileSync(filePath, glbData);
    return filePath;
  }

  listModels(): ModelInfo[] {
    if (!fs.existsSync(this.modelsDir)) return [];
    return fs.readdirSync(this.modelsDir)
      .filter((f) => f.endsWith('.glb') || f.endsWith('.gltf'))
      .map((f) => {
        const fullPath = path.join(this.modelsDir, f);
        const stat = fs.statSync(fullPath);
        return {
          id: path.parse(f).name,
          name: f,
          path: fullPath,
          size: stat.size,
          createdAt: stat.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  deleteModel(id: string): void {
    const files = fs.readdirSync(this.modelsDir)
      .filter((f) => f.startsWith(id));
    files.forEach((f) => {
      fs.unlinkSync(path.join(this.modelsDir, f));
    });
  }

  getModelPath(id: string): string | null {
    const file = fs.readdirSync(this.modelsDir)
      .find((f) => f.startsWith(id) && (f.endsWith('.glb') || f.endsWith('.gltf')));
    return file ? path.join(this.modelsDir, file) : null;
  }
}

export default ModelManager;
