// E2E: полный проход партии, продолжение сохранённой игры, редактор, битые и отсутствующие файлы, замеры.
// Запуск: npm run test:e2e (на Linux без экрана — через xvfb-run).
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = path.join(ROOT, 'tests', '.tmp');
const SHOTS = path.join(ROOT, 'test-results');
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const metrics = {};
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - t} мс)`);
    console.log(results.at(-1));
  } catch (e) {
    results.push(`✗ ${name}: ${e.message}`);
    console.error(results.at(-1));
    throw e;
  }
}

/** Запуск приложения с отдельными папками assets и userData */
async function launch(name, { fakeMic = false } = {}) {
  const assets = path.join(TMP, name, 'assets');
  const userData = path.join(TMP, name, 'userData');
  fs.mkdirSync(userData, { recursive: true });
  return startApp(assets, userData, fakeMic);
}

async function startApp(assets, userData, fakeMic = false) {
  const t0 = Date.now();
  const args = ['.', '--no-sandbox'];
  if (fakeMic) args.push('--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream');
  const app = await electron.launch({
    args,
    cwd: ROOT,
    env: { ...process.env, SHREK_ASSETS: assets, SHREK_USER_DATA: userData, SHREK_WINDOWED: '1' },
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text()) && errors.push(m.text()));
  await page.getByTestId('btn-start').waitFor({ timeout: 15000 });
  return { app, page, errors, assets, userData, startupMs: Date.now() - t0 };
}

const tid = (page, id) => page.getByTestId(id);
const visible = (loc) => loc.isVisible().catch(() => false);

/** Проходит мини-игру «как хорошая команда» */
async function solve(page, type, teams) {
  const mg = tid(page, `minigame-${type}`);
  await mg.waitFor();
  const until = async (cond) => {
    for (let i = 0; i < 200 && !(await cond()); i++) await page.waitForTimeout(100);
  };
  const resultShown = () => visible(tid(page, 'result'));
  switch (type) {
    case 'guess_description':
      await tid(page, 'btn-yes').click();
      break;
    case 'repeat_phrase':
      await tid(page, 'rate-2').click();
      break;
    case 'odd_one_out':
      await mg.locator('[data-correct="1"]').click();
      break;
    case 'charades':
      await tid(page, 'card').hover();
      await page.mouse.down();
      await mg.locator('.mg-card.open').waitFor();
      await page.mouse.up();
      await tid(page, 'btn-go').click();
      await tid(page, 'btn-yes').click();
      break;
    case 'quick_questions':
      while (!(await resultShown())) {
        const opt = mg.locator('[data-correct="1"]:not([disabled])');
        if (await visible(opt)) await opt.click().catch(() => undefined);
        await page.waitForTimeout(250);
        if (await resultShown()) break;
        await until(async () => (await resultShown()) || !(await mg.locator('.mg-option.ok').count()));
      }
      return;
    case 'true_false':
      while (!(await resultShown())) {
        const t = tid(page, 'btn-true');
        if (await t.isEnabled().catch(() => false)) {
          const ans = await t.getAttribute('data-answer');
          await tid(page, ans === 'true' ? 'btn-true' : 'btn-false').click().catch(() => undefined);
        }
        await page.waitForTimeout(250);
      }
      return;
    case 'word_builder': {
      // Перебираем плитки: неверная буква не принимается — так проверяем и защиту от ошибок
      const len = await mg.locator('.slot').count();
      for (let k = 0; k < len; k++) {
        const tiles = mg.locator('[data-testid="tile"]:not(.used)');
        const n = await tiles.count();
        const tried = new Set();
        for (let i = 0; i < n; i++) {
          const ch = await tiles.nth(i).getAttribute('data-ch');
          if (tried.has(ch)) continue;
          tried.add(ch);
          await tiles.nth(i).click();
          if ((await mg.locator('.slot.filled').count()) > k) break;
        }
      }
      break;
    }
    case 'shout': {
      await until(async () => (await visible(tid(page, `manual-${teams[0]}`))) || (await visible(tid(page, 'btn-shout'))));
      if (await visible(tid(page, 'btn-shout'))) {
        // Фейковый микрофон Chromium: каждая команда «кричит» по очереди
        const recorded = async () => (await mg.locator('.shout-val').allTextContents()).filter((t) => t !== '—').length;
        for (let i = 0; i < teams.length; i++) {
          await tid(page, 'btn-shout').click();
          await until(async () => (await recorded()) > i);
        }
        metrics.shoutLevels = Object.fromEntries(await Promise.all(teams.map(async (t) => [t, await tid(page, `level-${t}`).textContent()])));
      } else {
        metrics.shoutMode = 'manual';
        await tid(page, `manual-${teams[0]}`).click();
      }
      break;
    }
    case 'final_quiz':
      for (let q = 0; q < 3 && !(await resultShown()); q++) {
        await tid(page, `who-${teams[q % teams.length]}`).click();
        await tid(page, 'btn-right').click();
        await until(async () => (await resultShown()) || (await visible(tid(page, 'btn-skip'))));
      }
      break;
    default:
      throw new Error(`Неизвестная мини-игра ${type}`);
  }
}

/** Память всех процессов, МБ. На Linux — PSS (RSS считает общие библиотеки в каждом процессе по разу),
 *  на Windows — private working set, как в диспетчере задач. */
function processMb(p) {
  if (process.platform === 'linux') {
    try {
      const r = fs.readFileSync(`/proc/${p.pid}/smaps_rollup`, 'utf8');
      return Number(/^Pss:\s+(\d+)/m.exec(r)[1]) / 1024;
    } catch {
      /* процесс уже завершился */
    }
  }
  return (p.memory?.privateBytes ?? p.memory?.workingSetSize ?? 0) / 1024;
}

async function measure(app, page, label) {
  const snap = async () => {
    const m = await app.evaluate(({ app: a }) => a.getAppMetrics());
    return { mb: Math.round(m.reduce((s, p) => s + processMb(p), 0)), cpu: Math.round(m.reduce((s, p) => s + (p.cpu?.percentCPUUsage ?? 0), 0)) };
  };
  const before = await snap();
  // V8 собирает мусор лениво; после принудительной сборки видно, сколько памяти реально занято
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.detach();
  await page.waitForTimeout(500);
  const after = await snap();
  metrics[label] = { mbBeforeGc: before.mb, mb: after.mb, cpu: before.cpu };
  return metrics[label];
}

// ─── 1. Первый запуск: пустая папка → assets создаются из встроенных дефолтов, полная партия ─────
let game;
await step('первый запуск создаёт assets и открывает меню', async () => {
  game = await launch('play', { fakeMic: true });
  metrics.startupMs = game.startupMs;
  assert.ok(fs.existsSync(path.join(game.assets, 'config', 'questions.json')), 'config/questions.json не скопирован');
  assert.ok(fs.existsSync(path.join(game.assets, 'images', 'map', 'background.svg')), 'фон карты не скопирован');
  assert.equal(await visible(tid(game.page, 'warnings')), false, 'не должно быть предупреждений');
  await game.page.screenshot({ path: path.join(SHOTS, '01-start.png') });
});

const teamIds = [];
await step('настройка команд и выход на карту', async () => {
  const { page } = game;
  const t = Date.now();
  await tid(page, 'btn-start').click();
  await tid(page, 'team-card').first().waitFor();
  metrics.screenSwitchMs = Date.now() - t;
  assert.equal(await tid(page, 'team-card').count(), 3);
  await tid(page, 'team-name-0').fill('Огры');
  await tid(page, 'btn-go').click();
  await tid(page, 'btn-roll').waitFor({ timeout: 10000 });
  for (const el of await page.locator('[data-testid^="token-"]').all()) teamIds.push((await el.getAttribute('data-testid')).slice(6));
  assert.equal(teamIds.length, 3);
  assert.match(await page.locator('.turn').textContent(), /Огры/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOTS, '02-map.png') });
});

await step('все 9 локаций: кубик → заставка → мини-игра → результат', async () => {
  const { page } = game;
  const seen = new Set();
  for (let turn = 0; turn < 9; turn++) {
    await tid(page, 'btn-roll').waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    if (turn % 2) await page.keyboard.press('Space');
    else await tid(page, 'btn-roll').click();
    await tid(page, 'loc-name').waitFor({ timeout: 20000 });
    const name = await tid(page, 'loc-name').textContent();
    assert.ok(!seen.has(name), `повторная локация ${name}`);
    seen.add(name);
    if (turn === 0) await page.screenshot({ path: path.join(SHOTS, '03-location.png') });
    await tid(page, 'btn-begin').click();
    const mg = page.locator('[data-testid^="minigame-"]');
    await mg.waitFor();
    const type = (await mg.getAttribute('data-testid')).slice(9);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, `04-${turn + 1}-${type}.png`) });
    await solve(page, type, teamIds);
    await tid(page, 'result').waitFor({ timeout: 45000 });
    console.log(`   ${turn + 1}. ${name} (${type}): ${(await page.locator('.res-summary').textContent()).trim()}`);
    if (turn === 8) await page.screenshot({ path: path.join(SHOTS, '05-result.png') });
    if (turn === 4) {
      // Середина партии: партия записана на диск
      await page.waitForTimeout(400);
      const snap = JSON.parse(fs.readFileSync(path.join(game.userData, 'session.json'), 'utf8'));
      assert.equal(Object.keys(snap.completed).length, 5);
      await measure(game.app, page, 'midGame');
    }
    await tid(page, 'btn-continue').click();
  }
  assert.equal(seen.size, 9);
});

await step('финал: подиум, счёт, сессия очищена', async () => {
  const { page } = game;
  await tid(page, 'finale').waitFor({ timeout: 10000 });
  await page.getByTestId('btn-again').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500);
  const sc = (await page.locator('.pod-score').allTextContents()).map((t) => Number(t.replace(/\D/g, '')));
  assert.equal(sc.length, 3, 'на подиуме должно быть 3 команды');
  assert.ok(sc[0] > 0, `никто не набрал очков: ${JSON.stringify(sc)}`);
  metrics.finalScores = sc;
  await page.screenshot({ path: path.join(SHOTS, '06-finale.png') });
  await page.waitForTimeout(500);
  assert.equal(fs.existsSync(path.join(game.userData, 'session.json')), false, 'session.json должен удаляться после финала');
});

await step('замер простоя (ОЗУ, CPU)', async () => {
  await tid(game.page, 'btn-again').click();
  await tid(game.page, 'btn-roll').waitFor();
  await game.page.waitForTimeout(3000);
  await measure(game.app, game.page, 'idle');
  await game.page.waitForTimeout(2000);
  const { mb, cpu } = await measure(game.app, game.page, 'idle');
  assert.ok(mb < 500, `ОЗУ в простое ${mb} МБ ≥ 500`);
  assert.ok(cpu < 30, `CPU в простое ${cpu}% ≥ 30`);
  assert.deepEqual(game.errors, [], 'ошибки в консоли');
  await game.app.close();
});

// ─── 2. Продолжение прерванной партии ─────
await step('«Продолжить» восстанавливает прерванную партию', async () => {
  const g = await launch('resume');
  await tid(g.page, 'btn-start').click();
  await tid(g.page, 'btn-go').click();
  await tid(g.page, 'btn-roll').click();
  await tid(g.page, 'btn-begin').waitFor({ timeout: 20000 });
  await tid(g.page, 'btn-begin').click();
  const type = (await g.page.locator('[data-testid^="minigame-"]').getAttribute('data-testid')).slice(9);
  const ids = [];
  for (const el of await g.page.locator('[data-testid^="score-"]:not([data-testid="score-value"])').all()) ids.push((await el.getAttribute('data-testid')).slice(6));
  await solve(g.page, type, ids);
  await tid(g.page, 'btn-continue').click();
  await tid(g.page, 'btn-roll').waitFor();
  await g.page.waitForTimeout(500);
  await g.app.close();

  const g2 = await startApp(g.assets, g.userData);
  await tid(g2.page, 'btn-resume').waitFor({ timeout: 5000 });
  assert.match(await tid(g2.page, 'btn-resume').textContent(), /1 из 9/);
  await tid(g2.page, 'btn-resume').click();
  await tid(g2.page, 'btn-roll').waitFor();
  assert.match(await g2.page.locator('.map-title').textContent(), /Пройдено 1 из 9/);
  await g2.app.close();
});

// ─── 3. Редактор: правка → сохранение в JSON + резервная копия ─────
await step('редактор сохраняет изменения в assets/config', async () => {
  const g = await launch('editor');
  const { page } = g;
  await tid(page, 'btn-editor').click();
  await tid(page, 'editor').waitFor();
  await tid(page, 'tab-teams').click();
  await tid(page, 'ed-team-name-0').fill('Болотные огры');
  await tid(page, 'tab-questions').click();
  await tid(page, 'qtype-word_builder').click();
  const before = await tid(page, 'q-item').count();
  await tid(page, 'btn-add-q').click();
  assert.equal(await tid(page, 'q-item').count(), before + 1);
  await tid(page, 'q-item').last().locator('input').first().fill('ГРИФОН');
  await page.screenshot({ path: path.join(SHOTS, '07-editor.png') });
  await tid(page, 'btn-save').click();
  await page.getByText('Сохранено ✓').waitFor();
  const teams = JSON.parse(fs.readFileSync(path.join(g.assets, 'config', 'teams.json'), 'utf8'));
  assert.equal(teams.teams[0].name, 'Болотные огры');
  const q = JSON.parse(fs.readFileSync(path.join(g.assets, 'config', 'questions.json'), 'utf8'));
  assert.equal(q.word_builder.at(-1).word, 'ГРИФОН');
  assert.ok(fs.existsSync(path.join(g.assets, 'config', 'teams.bak.json')), 'нет резервной копии teams.bak.json');
  await g.app.close();

  // После перезапуска игра видит новые данные
  const g2 = await startApp(g.assets, g.userData);
  await tid(g2.page, 'btn-start').click();
  assert.equal(await tid(g2.page, 'team-name-0').inputValue(), 'Болотные огры');
  await g2.app.close();
});

// ─── 4. Битые и отсутствующие файлы: игра не падает ─────
await step('битый JSON и пропавшие картинки → предупреждение и заглушки', async () => {
  const g = await launch('broken');
  await g.app.close();
  fs.writeFileSync(path.join(g.assets, 'config', 'questions.json'), '{\n  "quick_questions": [\n    { "q": "Сломано", }\n  ]\n');
  fs.rmSync(path.join(g.assets, 'config', 'locations.json'));
  fs.rmSync(path.join(g.assets, 'images', 'characters'), { recursive: true });
  const g2 = await startApp(g.assets, g.userData);
  const { page } = g2;
  await tid(page, 'warnings').waitFor();
  const text = await tid(page, 'warnings').textContent();
  assert.match(text, /questions\.json: ошибка в строке 3, столбец \d+/);
  assert.equal(text.match(/locations\.json/g).length, 1, 'предупреждение о locations.json продублировано');
  assert.match(text, /locations\.json: файл не найден/);
  await page.screenshot({ path: path.join(SHOTS, '08-warnings.png') });
  await tid(page, 'btn-start').click();
  await tid(page, 'team-card').first().waitFor();
  assert.ok((await page.locator('.team-avatar svg[role="img"]').count()) >= 3, 'нет SVG-заглушек вместо картинок');
  await tid(page, 'btn-go').click();
  await tid(page, 'btn-roll').click();
  await tid(page, 'btn-begin').waitFor({ timeout: 20000 });
  await g2.app.close();
});

console.log('\nЗамеры:', JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(SHOTS, 'metrics.json'), JSON.stringify({ results, metrics }, null, 2));
console.log(`\nВсе проверки пройдены (${results.length}).`);
