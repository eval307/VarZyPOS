import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme, applyThemeAccent } from './utils/theme';
import { ErrorBoundary } from './components/ErrorBoundary';

// Public pages default to light fresh emerald green without overriding saved store settings
applyTheme('light', false);
applyThemeAccent('emerald', false);

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

