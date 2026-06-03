import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const mountNode = document.getElementById('financasa-modern-root');

if (mountNode) {
  createRoot(mountNode).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
