import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/lobster/cyrillic-400.css';
import '@fontsource/lobster/latin-400.css';
import '@fontsource/open-sans/cyrillic-400.css';
import '@fontsource/open-sans/cyrillic-600.css';
import '@fontsource/open-sans/cyrillic-700.css';
import '@fontsource/open-sans/cyrillic-800.css';
import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-700.css';
import '@fontsource/open-sans/latin-800.css';
import './styles/global.css';
import './screens/screens.css';
import { App } from './App';

window.addEventListener('error', (e) => window.api?.log('error', `${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => window.api?.log('error', `Unhandled: ${String(e.reason)}`));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
