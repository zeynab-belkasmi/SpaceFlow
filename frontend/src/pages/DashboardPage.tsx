import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { cancelBooking, listMyBookings } from '../api/endpoints';
import { Booking } from '../api/types';
import { StatusChip } from '../components/StatusChip';
import { useNotify } from '../context/NotificationContext';
import { errorMessage, formatSlot } from '../format';
import { useResourceNames } from '../hooks/useResourceNames';

/** My bookings, upcoming and past, with one-click cancellation (US-08). */
export function DashboardPage() {
  const notify = useNotify();
  const nameOf = useResourceNames();
  const [lists, setLists] = useState<{ upcoming: Booking[]; history: Booking[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Incremented after a cancellation to reload the list.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    listMyBookings()
      .then((bookings) => {
        if (ignore) return;
        // Split here, when the data arrives, not during render: rendering must be pure,
        // and "now" changes on every call.
        const now = Date.now();
        const isUpcoming = (b: Booking) =>
          b.status === 'CONFIRMED' && new Date(b.end).getTime() > now;
        setLists({
          // The API sorts most recent first; upcoming reads better soonest first.
          upcoming: bookings.filter(isUpcoming).reverse(),
          history: bookings.filter((b) => !isUpcoming(b)),
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!ignore) setError(errorMessage(e));
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  const cancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      notify('Booking cancelled.');
      setVersion((v) => v + 1);
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setCancellingId(null);
    }
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!lists) {
    return <CircularProgress aria-label="Loading" />;
  }
  const { upcoming, history } = lists;

  return (
    <Stack spacing={4}>
      <BookingTable
        title="Upcoming bookings"
        emptyText="No upcoming booking."
        bookings={upcoming}
        nameOf={nameOf}
        renderStatus={(b) => <StatusChip status={b.status} />}
        renderAction={(b) => (
          <Button
            size="small"
            color="error"
            disabled={cancellingId !== null}
            onClick={() => cancel(b.id)}
          >
            Cancel
          </Button>
        )}
      />
      <BookingTable
        title="Booking history"
        emptyText="No past booking."
        bookings={history}
        nameOf={nameOf}
        renderStatus={(b) => (
          <StatusChip status={b.status === 'CANCELLED' ? 'CANCELLED' : 'DONE'} />
        )}
      />
    </Stack>
  );
}

interface BookingTableProps {
  title: string;
  emptyText: string;
  bookings: Booking[];
  nameOf: (id: string) => string;
  renderStatus: (b: Booking) => React.ReactNode;
  renderAction?: (b: Booking) => React.ReactNode;
}

function BookingTable({
  title,
  emptyText,
  bookings,
  nameOf,
  renderStatus,
  renderAction,
}: BookingTableProps) {
  const columns = renderAction ? 4 : 3;
  return (
    <section>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label={title}>
          <TableHead>
            <TableRow>
              <TableCell>Resource</TableCell>
              <TableCell>Slot</TableCell>
              <TableCell>Status</TableCell>
              {renderAction && <TableCell align="right">Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns}>{emptyText}</TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{nameOf(b.resourceId)}</TableCell>
                  <TableCell>{formatSlot(b.start, b.end)}</TableCell>
                  <TableCell>{renderStatus(b)}</TableCell>
                  {renderAction && <TableCell align="right">{renderAction(b)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}
