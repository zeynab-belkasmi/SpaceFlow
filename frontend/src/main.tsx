// Self-hosted font (bundled by Vite): no request to a third-party font service.
import '@fontsource-variable/plus-jakarta-sans';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CurrentUserProvider } from './context/CurrentUserContext';
import { NotificationProvider } from './context/NotificationContext';
import { theme } from './theme';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element in index.html.');
}

// Providers wrap the app once: theme → notifications → current user → pages.
createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
