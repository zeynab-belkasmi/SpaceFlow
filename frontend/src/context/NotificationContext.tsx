import { Alert, AlertColor, Snackbar } from '@mui/material';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type Notify = (message: string, severity?: AlertColor) => void;

const NotificationContext = createContext<Notify | null>(null);

/**
 * One Snackbar for the whole app. Any component calls `notify(...)` instead of
 * managing its own toast (US-07: visual feedback on success and on API errors).
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ message: string; severity: AlertColor } | null>(null);

  // useCallback: the same function on every render, so it is safe in effect dependencies.
  const notify = useCallback<Notify>((message, severity = 'success') => {
    setCurrent({ message, severity });
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={current !== null}
        autoHideDuration={5000}
        onClose={() => setCurrent(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Snackbar needs a child even while closing, hence the fallback. */}
        <Alert
          severity={current?.severity ?? 'info'}
          variant="filled"
          onClose={() => setCurrent(null)}
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify(): Notify {
  const notify = useContext(NotificationContext);
  if (!notify) {
    throw new Error('useNotify() must be used inside <NotificationProvider>.');
  }
  return notify;
}
