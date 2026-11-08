import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './l5-ui/App.tsx';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root container #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
