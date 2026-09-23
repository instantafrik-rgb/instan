import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWAUpdate } from './pwaUpdate';

// Initialise le suivi et la mise à jour automatique PWA (Android / Windows / Web)
initPWAUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

