import React from 'react';
import ReactDOM from 'react-dom/client';
import './firebase.js';   // inicializa Firebase y setea window._db/_auth/_fbReady
import './index.css';
import App, { LoginGate } from './App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<LoginGate><App /></LoginGate>);
