import { Chip } from '@mui/material';
import { BookingStatus, ResourceStatus } from '../api/types';

const STYLE = {
  AVAILABLE: { label: 'Available', color: 'success' },
  MAINTENANCE: { label: 'Maintenance', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'primary' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
  DONE: { label: 'Done', color: 'default' },
} as const;

/** Colour-coded status. The text is always shown: colour is never the only signal. */
export function StatusChip({ status }: { status: ResourceStatus | BookingStatus | 'DONE' }) {
  const { label, color } = STYLE[status];
  return <Chip size="small" label={label} color={color} variant="outlined" />;
}
