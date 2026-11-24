import { Paper, Skeleton, Stack } from '@mui/material';

/**
 * Placeholder with roughly the shape of the coming table, so the layout does not jump
 * when the data arrives. `aria-busy` + a label tell screen readers that content is loading.
 */
export function LoadingRows({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} aria-busy="true" aria-label={label} role="status">
      <Stack spacing={1.5}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={28} />
        ))}
      </Stack>
    </Paper>
  );
}
