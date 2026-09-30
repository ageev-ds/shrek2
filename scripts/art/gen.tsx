// Генерирует SVG-картинки в assets/images: персонажи, предметы, иконки локаций.
// Запуск: node scripts/gen-art.mjs
import fs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { AVATARS, ILLUSTRATIONS, ArtMedallion } from './art';
import { PLACES } from './places';

const write = (file: string, el: JSX.Element) => {
  const svg = renderToStaticMarkup(el).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  fs.writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
};
const art = (a: (typeof AVATARS)[string]) => <ArtMedallion art={a} size={256} />;

for (const [id, a] of Object.entries(AVATARS)) write(`assets/images/characters/${id}.svg`, art(a));
for (const [id, a] of Object.entries(ILLUSTRATIONS)) if (!AVATARS[id]) write(`assets/images/characters/${id}.svg`, art(a));
for (const [id, a] of Object.entries(PLACES)) write(`assets/images/map/${id}.svg`, art(a));
console.log('SVG сгенерированы');
