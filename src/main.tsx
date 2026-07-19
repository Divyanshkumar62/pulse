if ((import.meta as any).env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { autoSaveService } from './services/autoSaveService';

autoSaveService.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
