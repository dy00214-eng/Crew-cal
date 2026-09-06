import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './styles/app.css';

/*
 * Web Share Target 은 실제 경로 /share 로 들어온다.
 * 라우팅은 HashRouter 라서(정적 호스팅 안전) 여기서 한 번 갈아탄다.
 */
const { pathname, search, hash } = window.location;
const shareEntry = !hash && /\/share\/?$/.test(pathname);

if (shareEntry) {
  const base = pathname.replace(/share\/?$/, '');
  window.location.replace(`${base}#/share${search}`);
} else {
  registerSW({ immediate: true });
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    );
  }
}
