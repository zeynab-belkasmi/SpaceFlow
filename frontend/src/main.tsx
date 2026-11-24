import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CurrentUserProvider } from './context/CurrentUserContext';
import { NotificationProvider } from './context/NotificationContext';

const theme = createTheme({
  palette: { primary: { main: '#3949ab' } },
  shape: { borderRadius: 8 },
});

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
