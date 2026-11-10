import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTheme } from './utils/theme';
import { ErrorBoundary } from './components/ErrorBoundary';

// Synchronously initialize theme from localStorage or OS before React mounts
initTheme();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

