import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { setCurrentUserId } from '../api/client';
import { listUsers } from '../api/endpoints';
import { User } from '../api/types';
import { errorMessage } from '../format';

const STORAGE_KEY = 'spaceflow.userId';

interface CurrentUser {
  users: User[];
  user: User;
  selectUser: (id: string) => void;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

/**
 * Simplified "login": the app loads the seeded users and lets you pick one.
 * The choice is remembered in localStorage and sent to the API by the Axios interceptor.
 * Children render only once a user is known, so every API call is authenticated.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumping this number re-runs the effect below: that is how "Retry" reloads.
  const [attempt, setAttempt] = useState(0);

  // The effect only starts the request; state changes happen when the answer arrives.
  useEffect(() => {
    let ignore = false;
    listUsers()
      .then((loaded) => {
        if (ignore) return;
        const remembered = localStorage.getItem(STORAGE_KEY);
        const initial = loaded.find((u) => u.id === remembered) ?? loaded[0];
        // Set the header BEFORE children render and start their own requests.
        setCurrentUserId(initial?.id ?? null);
        setUsers(loaded);
        setUserId(initial?.id ?? null);
      })
      .catch((e: unknown) => {
        if (!ignore) setError(errorMessage(e));
      });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  const retry = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };

  const selectUser = useCallback((id: string) => {
    setCurrentUserId(id);
    localStorage.setItem(STORAGE_KEY, id);
    setUserId(id);
  }, []);

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ m: 4 }}
        action={
          <Button color="inherit" onClick={retry}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const user = users?.find((u) => u.id === userId);
  if (!users || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <CurrentUserContext.Provider value={{ users, user, selectUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUser {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser() must be used inside <CurrentUserProvider>.');
  }
  return context;
}
