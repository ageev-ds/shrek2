// Иконка приложения: build/icon.svg → build/icon.png (окно) и build/icon.ico (exe).
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const svg = fs.readFileSync('build/icon.svg');
const render = (size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

fs.writeFileSync('build/icon.png', render(512));
const ico = await pngToIco([256, 128, 64, 48, 32, 16].map(render));
fs.writeFileSync('build/icon.ico', ico);
console.log('build/icon.png и build/icon.ico готовы');
