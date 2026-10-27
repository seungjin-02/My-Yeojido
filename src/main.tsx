import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';
import './places.css';
import './profile.css';
import './guides.css';
import './atlas.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
