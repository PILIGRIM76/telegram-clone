
// Полифилл для crypto.randomUUID() ДОЛЖЕН быть первой строкой (до React/любых компонентов)
import './src/polyfills/crypto';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
