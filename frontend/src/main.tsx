import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Initialize Firebase — must be imported before any Firebase service is used
import './lib/firebase';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
