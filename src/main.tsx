import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { resetGlobalRootTheme } from './utils/theme';
import { ErrorBoundary } from './components/ErrorBoundary';

// Ensure root is pristine and clean of any dark or accent variables
resetGlobalRootTheme();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
