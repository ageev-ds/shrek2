// Проверка папки assets: JSON читается, у каждой локации своя игра, все упомянутые файлы на месте.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? 'assets');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, 'config', f), 'utf8'));
const errors = [];
const warns = [];
const exists = (rel) => fs.existsSync(path.join(dir, rel));

const { game } = read('game.json');
const { teams } = read('teams.json');
const { locations } = read('locations.json');
const q = read('questions.json');

if (teams.length < 2) errors.push('Нужно минимум 2 команды');
for (const t of teams) if (!exists(`images/characters/${t.character}`)) errors.push(`Нет фишки ${t.character} у «${t.name}»`);
const ids = new Set();
for (const l of locations) {
  if (ids.has(l.id)) errors.push(`Повтор id локации ${l.id}`);
  ids.add(l.id);
  if (!exists(`images/map/${l.icon}`)) errors.push(`Нет иконки ${l.icon} у «${l.name}»`);
  if (!q[l.game]?.length) errors.push(`Нет вопросов для игры ${l.game} («${l.name}»)`);
  if (l.video && !exists(`videos/${l.video}`)) warns.push(`видео ${l.video} не найдено — заставка «${l.name}» будет пропущена`);
}
if (!exists(`images/map/${game.mapBackground}`)) errors.push(`Нет фона карты ${game.mapBackground}`);
for (const o of q.odd_one_out) for (const it of o.items) if (!exists(`images/characters/${it.image}`)) errors.push(`Нет картинки ${it.image} («${o.title}»)`);
for (const w of q.word_builder) if (w.word.length > 16) errors.push(`Слово ${w.word} длиннее 16 букв`);
for (const x of q.quick_questions) if (x.correct >= x.options.length) errors.push(`Неверный correct в «${x.q}»`);
if (q.quick_questions.length < game.quickCount) errors.push('Быстрых вопросов меньше, чем quickCount');
if (q.true_false.length < game.trueFalseCount) errors.push('Утверждений меньше, чем trueFalseCount');
if (q.final_quiz.length < game.finalCount) errors.push('Финальных вопросов меньше, чем finalCount');

const count = Object.values(q).reduce((s, a) => s + a.length, 0);
console.log(`assets: ${teams.length} команды, ${locations.length} локаций, ${count} вопросов/заданий`);
if (warns.length) console.log('Замечания (не ошибки):\n' + warns.map((w) => ' - ' + w).join('\n'));
if (errors.length) {
  console.error('Ошибки:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('assets в порядке ✓');
