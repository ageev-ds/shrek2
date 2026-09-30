// Сборка portable-exe для Windows и папки для раздачи: release/Путь-Шрека/{exe, assets/, README.txt} + zip.
// Запуск: npm run build:portable   (с флагом --linux — распакованная Linux-сборка для проверки на этой машине)
import { build, Platform } from 'electron-builder';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const linux = process.argv.includes('--linux');
const OUT = 'release-tmp';
const RELEASE = 'release';
const FOLDER = 'Путь-Шрека';
const exeName = `Шрек-Игра-${pkg.version}-portable.exe`;

if (!fs.existsSync('build/icon.ico') || !fs.existsSync('build/icon.png')) execFileSync('node', ['scripts/make-icon.mjs'], { stdio: 'inherit' });
fs.rmSync(OUT, { recursive: true, force: true });

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'ru.ageev.shrek-path',
  productName: pkg.productName,
  copyright: '© 2026',
  directories: { output: OUT, buildResources: 'build' },
  files: ['dist-electron/**', 'dist-renderer/**', 'build/icon.png', 'package.json'],
  // Встроенная копия контента: из неё создаётся assets/ при первом запуске без папки
  extraResources: [{ from: 'assets', to: 'default-assets', filter: ['**/*', '!**/*.bak.json', '!**/.write-test-*'] }],
  asar: true,
  // Быстрее распаковка portable-exe при каждом запуске
  compression: 'normal',
  electronLanguages: ['ru', 'en-US'],
  npmRebuild: false,
  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    icon: 'build/icon.ico',
    // Подписи нет, но иконка и сведения о версии в exe прописываются
    signExecutable: false,
  },
  portable: { artifactName: exeName, unpackDirName: 'shrek-path' },
  linux: { target: ['dir'], icon: 'build/icon.png', category: 'Game' },
};

await build({ targets: (linux ? Platform.LINUX : Platform.WINDOWS).createTarget(), config, publish: 'never' });

if (linux) {
  console.log(`\nLinux-сборка: ${OUT}/linux-unpacked`);
  process.exit(0);
}

// Папка для раздачи: exe + assets рядом + инструкции
const dist = path.join(RELEASE, FOLDER);
fs.rmSync(RELEASE, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(OUT, exeName), path.join(dist, exeName));
fs.cpSync('assets', path.join(dist, 'assets'), { recursive: true, filter: (f) => !f.endsWith('.bak.json') });
// Пустые папки под свои файлы, чтобы было видно, куда их класть
for (const d of ['videos', 'audio/music', 'audio/sfx', 'audio/voice', 'images/ui']) fs.mkdirSync(path.join(dist, 'assets', d), { recursive: true });
fs.copyFileSync('README.md', path.join(dist, 'README.txt'));

const zip = path.join(RELEASE, `${FOLDER}-${pkg.version}.zip`);
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', path.resolve(zip), FOLDER], { cwd: RELEASE, stdio: 'inherit' });
}
const mb = (f) => (fs.statSync(f).size / 1024 / 1024).toFixed(1);
console.log(`\nГотово:\n  ${path.join(dist, exeName)} (${mb(path.join(dist, exeName))} МБ)\n  ${zip} (${mb(zip)} МБ)`);
