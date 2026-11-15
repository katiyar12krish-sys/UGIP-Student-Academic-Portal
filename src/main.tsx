// ===================================================================================================
// Browser entry point: mounts the React app inside <div id="root"> of index.html.
// ===================================================================================================
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
