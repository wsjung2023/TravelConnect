import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
// Initialize i18n (must be imported before App)
import './lib/i18n';

createRoot(document.getElementById('root')!).render(<App />);
