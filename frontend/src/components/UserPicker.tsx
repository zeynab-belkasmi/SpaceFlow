import { NativeSelect, Stack, Typography } from '@mui/material';
import { useCurrentUser } from '../context/CurrentUserContext';

const ROLE_LABEL = { STUDENT: 'Student', FACULTY: 'Faculty', ADMIN: 'Admin' } as const;

/**
 * "Log in as": a native <select> (simple, accessible, good on mobile).
 * The label is a real visible text linked with aria-labelledby, placed above the field
 * so it never overlaps the app bar (the previous floating label did).
 */
export function UserPicker() {
  const { users, user, selectUser } = useCurrentUser();

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography
        id="user-picker-label"
        variant="caption"
        sx={{ color: '#CCFBF1', lineHeight: 1.2 }} // 4.86:1 on the teal app bar.
      >
        Signed in as
      </Typography>
      <NativeSelect
        value={user.id}
        onChange={(e) => selectUser(e.target.value)}
        disableUnderline
        inputProps={{ 'aria-labelledby': 'user-picker-label' }}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          px: 1,
          fontSize: 14,
          // Never wider than the screen allows: no horizontal scroll on phones.
          width: { xs: 180, sm: 240 },
          maxWidth: '100%',
        }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({ROLE_LABEL[u.role]})
          </option>
        ))}
      </NativeSelect>
    </Stack>
  );
}
