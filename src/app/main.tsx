/**
 * 엔트리 — 레이어 조립은 App 이 한다. 여기는 마운트만.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tokens/index.css';
import '@ui/styles/base.css';
import { App, ThemeProvider } from '@app';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root element is missing');

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
