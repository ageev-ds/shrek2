import { useEffect, useMemo, useState } from 'react';
import { Confirm, MediaImage } from '../components/common';
import { hasMedia, useConfig, type MediaKind } from '../store/config';
import { useGame } from '../store/game';
import { play, setVolumes } from '../audio/audio';
import { GAME_TYPES, MOODS, type AllConfig, type GameType, type Location, type Mood, type Questions, type Team } from '../shared/types';
import { COLORS } from '../screens/TeamSetup';
import './editor.css';

type Tab = 'teams' | 'locations' | 'questions' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'teams', label: '👥 Команды' },
  { id: 'locations', label: '🗺 Локации' },
  { id: 'questions', label: '❓ Вопросы и задания' },
  { id: 'settings', label: '⚙ Настройки и тайминги' },
];

/** Режим редактирования: правки в черновике → «Сохранить» пишет JSON в assets/config */
export default function EditorScreen() {
  const assets = useConfig((s) => s.assets)!;
  const setConfig = useConfig((s) => s.setConfig);
  const go = useGame((s) => s.go);
  const [draft, setDraft] = useState<AllConfig>(() => structuredClone(assets.config));
  const [tab, setTab] = useState<Tab>('questions');
  const [status, setStatus] = useState('');
  const [leave, setLeave] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(assets.config), [draft, assets.config]);

  const save = async () => {
    const parts: (keyof AllConfig)[] = ['game', 'teams', 'locations', 'questions'];
    for (const p of parts) if (JSON.stringify(draft[p]) !== JSON.stringify(assets.config[p])) await window.api.saveConfig(p, draft[p]);
    setConfig(structuredClone(draft));
    setVolumes(draft.game.sfxVolume, draft.game.musicVolume);
    play('correct');
    setStatus(`Сохранено ✓ ${new Date().toLocaleTimeString('ru-RU')}`);
  };
  const reload = async () => {
    await useConfig.getState().load();
    setDraft(structuredClone(useConfig.getState().assets!.config));
    setStatus('Файлы перечитаны с диска');
  };

  return (
    <div className="screen editor" data-testid="editor">
      <header className="ed-head">
        <h1 className="title-gold">Режим редактирования</h1>
        <nav className="ed-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <span className="ed-status" data-testid="ed-status">
          {dirty ? '● есть несохранённые изменения' : status}
        </span>
        <button className="btn small green" onClick={() => void save()} disabled={!dirty} data-testid="btn-save">
          💾 Сохранить
        </button>
        <button className="btn small wood" onClick={() => (dirty ? setLeave(true) : go('start'))}>
          ✕ Выйти
        </button>
      </header>
      <main className="ed-main">
        {tab === 'teams' && <TeamsTab draft={draft} setDraft={setDraft} />}
        {tab === 'locations' && <LocationsTab draft={draft} setDraft={setDraft} />}
        {tab === 'questions' && <QuestionsTab draft={draft} setDraft={setDraft} />}
        {tab === 'settings' && <SettingsTab draft={draft} setDraft={setDraft} />}
      </main>
      <footer className="ed-foot muted">
        Папка с контентом: <code>{assets.dir}</code>
        <button className="btn small wood" onClick={() => void window.api.openAssetsFolder()}>
          📂 Открыть папку assets
        </button>
        <button className="btn small wood" onClick={() => void reload()}>
          ⟳ Перечитать файлы
        </button>
      </footer>
      <Confirm open={leave} title="Выйти без сохранения?" text="Несохранённые изменения пропадут." ok="Выйти" onOk={() => go('start')} onCancel={() => setLeave(false)} />
    </div>
  );
}

type TabProps = { draft: AllConfig; setDraft: React.Dispatch<React.SetStateAction<AllConfig>> };

function Text({ label, value, onChange, area, testId }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; testId?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea className="textarea" rows={2} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
      )}
    </label>
  );
}

function Num({ label, value, onChange, step = 10, min = 0, testId }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; testId?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="stepper">
        <button onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <input type="number" value={value} step={step} min={min} onChange={(e) => onChange(Number(e.target.value) || 0)} data-testid={testId} />
        <button onClick={() => onChange(value + step)}>+</button>
      </div>
    </label>
  );
}

const PICK_KIND: Record<MediaKind, 'video' | 'music' | 'voice' | 'character' | 'map' | 'image'> = {
  video: 'video',
  music: 'music',
  voice: 'voice',
  character: 'character',
  map: 'map',
  ui: 'image',
  sfx: 'voice',
};

/** Поле «файл в assets»: имя + кнопка выбора + индикатор наличия */
function MediaField({ label, kind, value, onChange, allowEmpty = true }: { label: string; kind: MediaKind; value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  const files = useConfig((s) => s.files);
  const exists = hasMedia(kind, value);
  void files;
  const pick = async () => {
    const name = await window.api.pickFile(PICK_KIND[kind]);
    if (!name) return;
    const a = await window.api.loadAssets();
    useConfig.setState({ files: new Set(a.files) });
    onChange(name);
  };
  return (
    <label className="field">
      <span>{label}</span>
      <div className="media-field">
        <input className="input" value={value} placeholder={allowEmpty ? '(нет)' : ''} onChange={(e) => onChange(e.target.value)} />
        <span className={`media-state ${exists ? 'ok' : value ? 'missing' : ''}`} title={exists ? 'Файл найден' : value ? 'Файл не найден — будет заглушка или пропуск' : ''}>
          {exists ? '✓' : value ? '⚠' : '—'}
        </span>
        <button className="btn small wood" onClick={() => void pick()}>
          Выбрать…
        </button>
        {allowEmpty && value && (
          <button className="icon-btn" onClick={() => onChange('')} title="Убрать">
            ✕
          </button>
        )}
      </div>
    </label>
  );
}

function TeamsTab({ draft, setDraft }: TabProps) {
  const upd = (i: number, patch: Partial<Team>) => setDraft((d) => ({ ...d, teams: d.teams.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  return (
    <div className="ed-grid">
      {draft.teams.map((t, i) => (
        <section key={i} className="ed-card" style={{ borderColor: t.color }}>
          <div className="row">
            <MediaImage kind="character" name={t.character} className="ed-avatar" />
            <h3>Команда {i + 1}</h3>
            <div className="spacer" />
            {draft.teams.length > 2 && (
              <button className="icon-btn" onClick={() => setDraft((d) => ({ ...d, teams: d.teams.filter((_, j) => j !== i) }))} title="Удалить">
                🗑
              </button>
            )}
          </div>
          <Text label="Название" value={t.name} onChange={(v) => upd(i, { name: v })} testId={`ed-team-name-${i}`} />
          <label className="field">
            <span>Цвет</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {COLORS.map((c) => (
                <button key={c} className={`swatch ${t.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => upd(i, { color: c })} />
              ))}
              <input type="color" value={t.color} onChange={(e) => upd(i, { color: e.target.value })} />
            </div>
          </label>
          <Text label="Эмодзи" value={t.emoji} onChange={(v) => upd(i, { emoji: v })} />
          <MediaField label="Фишка (images/characters)" kind="character" value={t.character} onChange={(v) => upd(i, { character: v })} allowEmpty={false} />
        </section>
      ))}
      {draft.teams.length < 6 && (
        <button
          className="ed-add"
          onClick={() => setDraft((d) => ({ ...d, teams: [...d.teams, { id: `team_${Date.now()}`, name: `Команда ${d.teams.length + 1}`, color: COLORS[d.teams.length % COLORS.length], emoji: '⭐', character: 'shrek.svg' }] }))}
        >
          ＋ Добавить команду
        </button>
      )}
    </div>
  );
}

function LocationsTab({ draft, setDraft }: TabProps) {
  const upd = (i: number, patch: Partial<Location>) => setDraft((d) => ({ ...d, locations: d.locations.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  return (
    <div className="ed-grid">
      {draft.locations.map((l, i) => (
        <section key={l.id} className="ed-card">
          <div className="row">
            <MediaImage kind="map" name={l.icon} className="ed-avatar" />
            <h3>
              {i + 1}. {l.name}
            </h3>
          </div>
          <Text label="Название" value={l.name} onChange={(v) => upd(i, { name: v })} testId={`ed-loc-name-${i}`} />
          <label className="field">
            <span>Мини-игра</span>
            <select className="select" value={l.game} onChange={(e) => upd(i, { game: e.target.value as GameType })}>
              {GAME_TYPES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.title}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <Num label="Луковицы за успех" value={l.reward} onChange={(v) => upd(i, { reward: v })} testId={`ed-loc-reward-${i}`} />
            <Num label={l.game === 'shout' ? 'Секунд на крик' : l.game === 'final_quiz' ? 'Секунд на вопрос' : 'Секунд на задание'} value={l.time} step={5} min={3} onChange={(v) => upd(i, { time: Math.max(3, v) })} testId={`ed-loc-time-${i}`} />
          </div>
          <Text label="Описание задания" value={l.description} onChange={(v) => upd(i, { description: v })} area />
          <MediaField label="Иконка (images/map)" kind="map" value={l.icon} onChange={(v) => upd(i, { icon: v })} allowEmpty={false} />
          <MediaField label="Видео-заставка (videos)" kind="video" value={l.video} onChange={(v) => upd(i, { video: v })} />
          <div className="row">
            <Num label="X на карте, %" value={l.x} step={1} onChange={(v) => upd(i, { x: Math.min(98, Math.max(2, v)) })} />
            <Num label="Y на карте, %" value={l.y} step={1} onChange={(v) => upd(i, { y: Math.min(98, Math.max(2, v)) })} />
          </div>
        </section>
      ))}
    </div>
  );
}

function SettingsTab({ draft, setDraft }: TabProps) {
  const g = draft.game;
  const upd = (patch: Partial<AllConfig['game']>) => setDraft((d) => ({ ...d, game: { ...d.game, ...patch } }));
  return (
    <div className="ed-grid">
      <section className="ed-card">
        <h3>Общее</h3>
        <Text label="Название игры" value={g.title} onChange={(v) => upd({ title: v })} testId="ed-title" />
        <Text label="Подзаголовок" value={g.subtitle} onChange={(v) => upd({ subtitle: v })} />
        <Num label="Бонус за прохождение без ошибок" value={g.perfectBonus} onChange={(v) => upd({ perfectBonus: v })} />
        <MediaField label="Фон карты (images/map)" kind="map" value={g.mapBackground} onChange={(v) => upd({ mapBackground: v })} allowEmpty={false} />
        <label className="check">
          <input type="checkbox" checked={g.particles} onChange={(e) => upd({ particles: e.target.checked })} /> Светлячки на фоне (выключите на очень слабом ПК)
        </label>
      </section>
      <section className="ed-card">
        <h3>Количество вопросов</h3>
        <Num label="Быстрые вопросы" value={g.quickCount} step={1} min={1} onChange={(v) => upd({ quickCount: v })} />
        <Num label="Правда или ложь" value={g.trueFalseCount} step={1} min={1} onChange={(v) => upd({ trueFalseCount: v })} />
        <Num label="Финальный квиз" value={g.finalCount} step={1} min={1} onChange={(v) => upd({ finalCount: v })} />
        <p className="muted small">Время на каждое задание настраивается во вкладке «Локации».</p>
      </section>
      <section className="ed-card">
        <h3>Видео</h3>
        <MediaField label="Интро (videos)" kind="video" value={g.introVideo} onChange={(v) => upd({ introVideo: v })} />
        <MediaField label="Ролик победы (videos)" kind="video" value={g.victoryVideo} onChange={(v) => upd({ victoryVideo: v })} />
        <label className="check">
          <input type="checkbox" checked={g.locationVideos} onChange={(e) => upd({ locationVideos: e.target.checked })} /> Показывать заставки локаций
        </label>
      </section>
      <section className="ed-card">
        <h3>Звук</h3>
        <MediaField label="Фоновая музыка (audio/music) — пусто: встроенная мелодия" kind="music" value={g.music} onChange={(v) => upd({ music: v })} />
        <label className="field">
          <span>Громкость музыки: {Math.round(g.musicVolume * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={g.musicVolume} onChange={(e) => upd({ musicVolume: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>Громкость звуков: {Math.round(g.sfxVolume * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={g.sfxVolume} onChange={(e) => upd({ sfxVolume: Number(e.target.value) })} />
        </label>
      </section>
    </div>
  );
}

// ---------- вопросы ----------

type QKey = keyof Questions;
const NEW_ITEM: { [K in QKey]: Questions[K][number] } = {
  guess_description: { text: '', answer: '' },
  quick_questions: { q: '', options: ['', '', '', ''], correct: 0 },
  repeat_phrase: { phrase: '', character: '', mood: 'happy', audio: '' },
  odd_one_out: { title: 'Что здесь лишнее?', items: Array.from({ length: 5 }, () => ({ image: '', label: '' })), odd: 0, explanation: '' },
  charades: { character: '', hint: '' },
  true_false: { statement: '', answer: true, explanation: '' },
  word_builder: { word: '', hint: '' },
  shout: { phrase: '' },
  final_quiz: { q: '', answer: '' },
};

function QuestionsTab({ draft, setDraft }: TabProps) {
  const [type, setType] = useState<QKey>('quick_questions');
  const list = draft.questions[type] as unknown as Record<string, unknown>[];
  const setList = (l: unknown[]) => setDraft((d) => ({ ...d, questions: { ...d.questions, [type]: l } }));
  const upd = (i: number, patch: Record<string, unknown>) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);
  return (
    <div className="ed-q">
      <aside className="ed-q-types">
        {GAME_TYPES.map((g) => (
          <button key={g.id} className={type === g.id ? 'on' : ''} onClick={() => setType(g.id)} data-testid={`qtype-${g.id}`}>
            {g.icon} {g.title} <span className="muted">({(draft.questions[g.id] as unknown[]).length})</span>
          </button>
        ))}
      </aside>
      <div className="ed-q-list">
        {list.map((item, i) => (
          <section key={i} className="ed-card ed-q-item" data-testid="q-item">
            <div className="row">
              <b>№{i + 1}</b>
              <div className="spacer" />
              <button className="icon-btn" disabled={list.length <= 1} onClick={() => setList(list.filter((_, j) => j !== i))} title="Удалить">
                🗑
              </button>
            </div>
            <QuestionFields type={type} item={item} onChange={(patch) => upd(i, patch)} index={i} />
          </section>
        ))}
        <button className="ed-add" onClick={() => setList([...list, structuredClone(NEW_ITEM[type])])} data-testid="btn-add-q">
          ＋ Добавить
        </button>
      </div>
    </div>
  );
}

function QuestionFields({ type, item, onChange, index }: { type: QKey; item: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void; index: number }) {
  const s = (k: string) => String(item[k] ?? '');
  switch (type) {
    case 'guess_description':
      return (
        <>
          <Text label="Описание (читает ведущий)" value={s('text')} onChange={(v) => onChange({ text: v })} area />
          <Text label="Ответ" value={s('answer')} onChange={(v) => onChange({ answer: v })} />
        </>
      );
    case 'quick_questions': {
      const options = (item.options as string[]) ?? [];
      return (
        <>
          <Text label="Вопрос" value={s('q')} onChange={(v) => onChange({ q: v })} testId={`ed-q-${index}`} />
          <div className="ed-options">
            {options.map((o, k) => (
              <label key={k} className={`ed-option ${item.correct === k ? 'correct' : ''}`}>
                <input type="radio" checked={item.correct === k} onChange={() => onChange({ correct: k })} title="Правильный ответ" />
                <input className="input" value={o} onChange={(e) => onChange({ options: options.map((x, j) => (j === k ? e.target.value : x)) })} />
              </label>
            ))}
          </div>
          <span className="muted small">Кружок отмечает правильный вариант.</span>
        </>
      );
    }
    case 'repeat_phrase':
      return (
        <>
          <Text label="Фраза" value={s('phrase')} onChange={(v) => onChange({ phrase: v })} />
          <div className="row">
            <Text label="Чья фраза" value={s('character')} onChange={(v) => onChange({ character: v })} />
            <label className="field">
              <span>Интонация</span>
              <select className="select" value={s('mood')} onChange={(e) => onChange({ mood: e.target.value as Mood })}>
                {Object.entries(MOODS).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <MediaField label="Аудио-пример (audio/voice) — пусто: голос компьютера" kind="voice" value={s('audio')} onChange={(v) => onChange({ audio: v })} />
        </>
      );
    case 'odd_one_out': {
      const items = (item.items as { image: string; label: string }[]) ?? [];
      return (
        <>
          <Text label="Задание" value={s('title')} onChange={(v) => onChange({ title: v })} />
          {items.map((it, k) => (
            <div key={k} className={`ed-odd ${item.odd === k ? 'correct' : ''}`}>
              <input type="radio" checked={item.odd === k} onChange={() => onChange({ odd: k })} title="Это лишнее" />
              <MediaImage kind="character" name={it.image} className="ed-thumb" />
              <input className="input" placeholder="Подпись" value={it.label} onChange={(e) => onChange({ items: items.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} />
              <MediaField label="" kind="character" value={it.image} onChange={(v) => onChange({ items: items.map((x, j) => (j === k ? { ...x, image: v } : x)) })} allowEmpty={false} />
            </div>
          ))}
          <Text label="Пояснение после ответа" value={s('explanation')} onChange={(v) => onChange({ explanation: v })} />
        </>
      );
    }
    case 'charades':
      return (
        <>
          <Text label="Персонаж (видит только показывающий)" value={s('character')} onChange={(v) => onChange({ character: v })} />
          <Text label="Подсказка показывающему" value={s('hint')} onChange={(v) => onChange({ hint: v })} />
        </>
      );
    case 'true_false':
      return (
        <>
          <Text label="Утверждение" value={s('statement')} onChange={(v) => onChange({ statement: v })} area />
          <label className="check">
            <input type="checkbox" checked={item.answer === true} onChange={(e) => onChange({ answer: e.target.checked })} /> Это правда
          </label>
          <Text label="Пояснение" value={s('explanation')} onChange={(v) => onChange({ explanation: v })} />
        </>
      );
    case 'word_builder':
      return (
        <>
          <Text label="Слово (до 16 букв)" value={s('word')} onChange={(v) => onChange({ word: v.toUpperCase().slice(0, 16) })} />
          <Text label="Подсказка" value={s('hint')} onChange={(v) => onChange({ hint: v })} />
        </>
      );
    case 'shout':
      return <Text label="Что кричать" value={s('phrase')} onChange={(v) => onChange({ phrase: v })} />;
    case 'final_quiz':
      return (
        <>
          <Text label="Вопрос" value={s('q')} onChange={(v) => onChange({ q: v })} />
          <Text label="Ответ (увидит ведущий)" value={s('answer')} onChange={(v) => onChange({ answer: v })} />
        </>
      );
  }
}
