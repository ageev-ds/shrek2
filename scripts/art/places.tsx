// Иконки 9 локаций — стилизованные «медальоны» в едином стиле с персонажами.
import type { ReactElement } from 'react';

type Art = { name: string; bg: [string, string]; draw: ReactElement };

export const PLACES: Record<string, Art> = {
  hut: {
    name: 'Хижина Шрека',
    bg: ['#b6d67a', '#3a5a2b'],
    draw: (
      <g>
        <ellipse cx="50" cy="86" rx="40" ry="8" fill="#2f4a1e" />
        <path d="M22 84 C18 60 24 40 34 34 L66 34 C76 40 82 60 78 84Z" fill="#6b4a2f" stroke="#3b2417" strokeWidth="2.5" />
        <path d="M28 36 C30 18 70 18 72 36Z" fill="#4f8a2b" stroke="#2f4a1e" strokeWidth="2.5" />
        <rect x="58" y="12" width="9" height="18" fill="#3b2417" />
        <path d="M44 84 L44 64 Q50 56 56 64 L56 84Z" fill="#2b1a0f" />
        <circle cx="35" cy="54" r="6" fill="#ffcf6b" stroke="#3b2417" strokeWidth="2" />
        <circle cx="66" cy="52" r="5" fill="#ffcf6b" stroke="#3b2417" strokeWidth="2" />
        <path d="M60 10 C56 2 66 0 62 -6" stroke="#e8e0d0" strokeWidth="3" fill="none" opacity="0.7" />
      </g>
    ),
  },
  forest: {
    name: 'Лес',
    bg: ['#9fd08a', '#1f3a17'],
    draw: (
      <g>
        <rect x="46" y="62" width="8" height="26" fill="#5a3a1c" />
        <path d="M50 10 L78 46 L64 46 L84 70 L16 70 L36 46 L22 46Z" fill="#2e7d32" stroke="#1b4d1e" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="20" y="70" width="6" height="18" fill="#5a3a1c" />
        <path d="M23 38 L38 62 L30 62 L40 76 L6 76 L16 62 L8 62Z" fill="#388e3c" stroke="#1b4d1e" strokeWidth="2" strokeLinejoin="round" />
        <rect x="74" y="72" width="6" height="16" fill="#5a3a1c" />
        <path d="M77 42 L92 64 L85 64 L94 78 L60 78 L69 64 L62 64Z" fill="#43a047" stroke="#1b4d1e" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="38" cy="34" r="2.5" fill="#fff6a8" />
        <circle cx="66" cy="28" r="2" fill="#fff6a8" />
      </g>
    ),
  },
  donkey_pen: {
    name: 'Загон Осла',
    bg: ['#e6d3a3', '#6b4a2f'],
    draw: (
      <g>
        <ellipse cx="50" cy="84" rx="42" ry="8" fill="#7a5c34" />
        <g stroke="#5a3a1c" strokeWidth="5" strokeLinecap="round">
          <line x1="10" y1="88" x2="10" y2="54" />
          <line x1="90" y1="88" x2="90" y2="54" />
          <line x1="6" y1="62" x2="94" y2="62" />
          <line x1="6" y1="76" x2="94" y2="76" />
        </g>
        <path d="M34 34 L28 8 L42 28Z M60 34 L66 8 L52 28Z" fill="#8a8f96" />
        <ellipse cx="47" cy="44" rx="17" ry="16" fill="#9aa0a8" />
        <ellipse cx="47" cy="60" rx="14" ry="11" fill="#d8d3cb" />
        <circle cx="41" cy="40" r="4" fill="#fff" />
        <circle cx="53" cy="40" r="4" fill="#fff" />
        <circle cx="42" cy="41" r="2" fill="#2b1a0c" />
        <circle cx="54" cy="41" r="2" fill="#2b1a0c" />
        <path d="M38 64 Q47 72 56 64" stroke="#3b3f45" strokeWidth="2.5" fill="none" />
        <rect x="42" y="64" width="10" height="4" rx="1" fill="#fffbe8" />
      </g>
    ),
  },
  duloc: {
    name: 'Дюлок',
    bg: ['#d6eaf8', '#1f4e79'],
    draw: (
      <g>
        <rect x="18" y="46" width="64" height="40" fill="#f2efe6" stroke="#8a8578" strokeWidth="2" />
        <rect x="12" y="30" width="16" height="56" fill="#fbf9f3" stroke="#8a8578" strokeWidth="2" />
        <rect x="72" y="30" width="16" height="56" fill="#fbf9f3" stroke="#8a8578" strokeWidth="2" />
        <rect x="38" y="22" width="24" height="30" fill="#fbf9f3" stroke="#8a8578" strokeWidth="2" />
        <path d="M10 30 L20 12 L30 30Z M70 30 L80 12 L90 30Z M36 22 L50 2 L64 22Z" fill="#c0392b" stroke="#7b241c" strokeWidth="1.5" />
        <path d="M42 86 L42 68 Q50 60 58 68 L58 86Z" fill="#6d4c41" />
        <path d="M50 2 L50 -6 L58 -3 L50 0" fill="#f1c94b" />
        <g fill="#8a8578">
          <rect x="14" y="26" width="4" height="4" />
          <rect x="22" y="26" width="4" height="4" />
          <rect x="74" y="26" width="4" height="4" />
          <rect x="82" y="26" width="4" height="4" />
        </g>
      </g>
    ),
  },
  cat_house: {
    name: 'Дом Кота',
    bg: ['#f8c471', '#8e4b0b'],
    draw: (
      <g>
        <rect x="22" y="48" width="56" height="38" fill="#e59866" stroke="#6e2c00" strokeWidth="2.5" />
        <path d="M14 50 L50 18 L86 50Z" fill="#a04000" stroke="#6e2c00" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M42 86 L42 66 Q50 58 58 66 L58 86Z" fill="#6e2c00" />
        <circle cx="34" cy="62" r="6" fill="#fdebd0" stroke="#6e2c00" strokeWidth="2" />
        <ellipse cx="50" cy="14" rx="20" ry="5" fill="#4a2d14" />
        <path d="M38 13 C38 2 62 2 62 12Z" fill="#5a3a1c" />
        <path d="M56 6 C66 -6 80 -2 82 2 C74 2 66 6 60 12Z" fill="#fdfefe" />
        <path d="M66 58 L72 50 L78 58 L74 58 L74 66 L70 66 L70 58Z" fill="#fdebd0" stroke="#6e2c00" strokeWidth="1.5" />
      </g>
    ),
  },
  dragon_lair: {
    name: 'Логово дракона',
    bg: ['#f1948a', '#4a0e0e'],
    draw: (
      <g>
        <path d="M6 90 L30 40 L42 56 L56 26 L94 90Z" fill="#3e2723" stroke="#1b0000" strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 90 Q50 70 56 90Z" fill="#ff7043" />
        <ellipse cx="50" cy="90" rx="30" ry="6" fill="#ff8a3b" opacity="0.8" />
        <path d="M52 26 C44 16 48 6 56 2 C54 10 62 12 60 22Z" fill="#ffb13b" />
        <path d="M60 50 C70 44 82 46 86 52 C80 52 76 56 74 60 C70 56 64 54 60 56Z" fill="#e0526e" />
        <circle cx="80" cy="50" r="1.8" fill="#2b0b12" />
        <path d="M84 52 L90 50 L88 54Z" fill="#ffb13b" />
      </g>
    ),
  },
  castle: {
    name: 'Замок Фаркуада',
    bg: ['#d7bde2', '#4a235a'],
    draw: (
      <g>
        <rect x="36" y="18" width="28" height="70" fill="#e8e4dc" stroke="#6c6457" strokeWidth="2" />
        <path d="M32 20 L50 -2 L68 20Z" fill="#8e44ad" stroke="#4a235a" strokeWidth="1.5" />
        <rect x="14" y="48" width="18" height="40" fill="#f4f1ea" stroke="#6c6457" strokeWidth="2" />
        <rect x="68" y="48" width="18" height="40" fill="#f4f1ea" stroke="#6c6457" strokeWidth="2" />
        <path d="M12 50 L23 32 L34 50Z M66 50 L77 32 L88 50Z" fill="#8e44ad" stroke="#4a235a" strokeWidth="1.5" />
        <rect x="45" y="30" width="10" height="14" rx="5" fill="#34495e" />
        <path d="M44 88 L44 72 Q50 64 56 72 L56 88Z" fill="#6d4c41" />
        <path d="M50 -2 L50 -10 L58 -7 L50 -4" fill="#c0392b" />
        <text x="50" y="62" textAnchor="middle" fontSize="12" fontWeight="900" fill="#c0392b">F</text>
      </g>
    ),
  },
  swamp: {
    name: 'Болото',
    bg: ['#a9cce3', '#1a3a2a'],
    draw: (
      <g>
        <ellipse cx="50" cy="66" rx="42" ry="20" fill="#4b6b3a" />
        <ellipse cx="50" cy="66" rx="34" ry="14" fill="#6b8e4e" />
        <ellipse cx="40" cy="62" rx="6" ry="2" fill="#a4c26a" opacity="0.7" />
        <circle cx="60" cy="70" r="3" fill="#a4c26a" opacity="0.6" />
        <circle cx="66" cy="62" r="2" fill="#a4c26a" opacity="0.6" />
        <g stroke="#2f4a1e" strokeWidth="3" strokeLinecap="round" fill="#5a3a1c">
          <path d="M16 70 L20 28" />
          <ellipse cx="20" cy="28" rx="4" ry="10" />
          <path d="M26 72 L28 38" />
          <ellipse cx="28" cy="38" rx="3.5" ry="9" />
          <path d="M82 72 L80 30" />
          <ellipse cx="80" cy="30" rx="4" ry="10" />
        </g>
        <ellipse cx="54" cy="56" rx="8" ry="4" fill="#58d68d" />
        <circle cx="50" cy="52" r="3" fill="#58d68d" />
        <circle cx="58" cy="52" r="3" fill="#58d68d" />
      </g>
    ),
  },
  throne: {
    name: 'Тронный зал',
    bg: ['#f9e79f', '#7d6608'],
    draw: (
      <g>
        <path d="M28 88 L28 30 Q50 6 72 30 L72 88Z" fill="#b71c1c" stroke="#5e1515" strokeWidth="2.5" />
        <path d="M34 60 L66 60 L66 72 L34 72Z" fill="#8e1414" />
        <rect x="22" y="58" width="10" height="30" rx="3" fill="#d4a017" stroke="#7d6608" strokeWidth="2" />
        <rect x="68" y="58" width="10" height="30" rx="3" fill="#d4a017" stroke="#7d6608" strokeWidth="2" />
        <rect x="30" y="72" width="40" height="10" rx="3" fill="#d4a017" stroke="#7d6608" strokeWidth="2" />
        <path d="M36 42 L40 28 L46 36 L50 24 L54 36 L60 28 L64 42Z" fill="#f1c94b" stroke="#9a7310" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="50" cy="38" r="2.5" fill="#c0392b" />
      </g>
    ),
  },
};
