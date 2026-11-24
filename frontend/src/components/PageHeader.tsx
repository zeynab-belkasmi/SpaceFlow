import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

/** Page title (h2, under the app's h1) and a one-line explanation of what the page is for. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h2" component="h2" gutterBottom={Boolean(children)}>
        {title}
      </Typography>
      {children && (
        <Typography variant="body1" color="text.secondary">
          {children}
        </Typography>
      )}
    </Box>
  );
}
