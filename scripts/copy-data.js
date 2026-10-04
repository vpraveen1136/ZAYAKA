import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy data to public/data (for dev server) and dist/data (for production build)
const dataDir = path.resolve('data');
const publicDataDir = path.resolve('public', 'data');
const distDataDir = path.resolve('dist', 'data');

copyDir(dataDir, publicDataDir);
if (fs.existsSync(path.resolve('dist'))) {
  copyDir(dataDir, distDataDir);
}

console.log('Catalogue data synced to public/data and dist/data.');
