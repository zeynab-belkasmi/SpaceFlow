import { TextField } from '@mui/material';
import { useCurrentUser } from '../context/CurrentUserContext';

const ROLE_LABEL = { STUDENT: 'Student', FACULTY: 'Faculty', ADMIN: 'Admin' } as const;

/** "Log in as": a native <select>, simple and accessible. */
export function UserPicker() {
  const { users, user, selectUser } = useCurrentUser();

  return (
    <TextField
      select
      size="small"
      label="Signed in as"
      value={user.id}
      onChange={(e) => selectUser(e.target.value)}
      slotProps={{ select: { native: true } }}
      sx={{ minWidth: 220, bgcolor: 'background.paper', borderRadius: 1 }}
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({ROLE_LABEL[u.role]})
        </option>
      ))}
    </TextField>
  );
}
