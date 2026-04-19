import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './routes/Landing.jsx';
import Analysis from './routes/Analysis.jsx';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/t/:symbol" element={<Analysis />} />
        <Route path="/t/:symbol/:date" element={<Analysis />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
