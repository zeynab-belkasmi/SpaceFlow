import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import {
  Alert,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { cancelBooking, listMyBookings } from '../api/endpoints';
import { Booking } from '../api/types';
import { LoadingRows } from '../components/LoadingRows';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';
import { useNotify } from '../context/NotificationContext';
import { errorMessage, formatSlot } from '../format';
import { useResourceNames } from '../hooks/useResourceNames';

interface DashboardPageProps {
  /** Shown as the action of the empty state. */
  onBrowseCatalog?: () => void;
}

/** My bookings, upcoming and past, with one-click cancellation (US-08). */
export function DashboardPage({ onBrowseCatalog }: DashboardPageProps) {
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

  const header = (
    <PageHeader title="My bookings">
      Your upcoming reservations and history. You can cancel a booking until it starts.
    </PageHeader>
  );

  if (error) {
    return (
      <>
        {header}
        <Alert severity="error">{error}</Alert>
      </>
    );
  }
  if (!lists) {
    return (
      <>
        {header}
        <LoadingRows label="Loading your bookings" />
      </>
    );
  }
  const { upcoming, history } = lists;

  return (
    <Stack spacing={4}>
      {header}
      <BookingTable
        title="Upcoming bookings"
        emptyText="No upcoming booking."
        emptyAction={
          onBrowseCatalog && (
            <Button size="small" onClick={onBrowseCatalog}>
              Browse the catalog
            </Button>
          )
        }
        bookings={upcoming}
        nameOf={nameOf}
        renderStatus={(b) => <StatusChip status={b.status} />}
        renderAction={(b) => (
          <Button
            size="small"
            color="error"
            startIcon={<EventBusyOutlined aria-hidden />}
            disabled={cancellingId !== null}
            onClick={() => cancel(b.id)}
            // Every row has a "Cancel" button: the accessible name says WHICH booking.
            aria-label={`Cancel booking: ${nameOf(b.resourceId)}, ${formatSlot(b.start, b.end)}`}
          >
            {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
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
  emptyAction?: React.ReactNode;
  bookings: Booking[];
  nameOf: (id: string) => string;
  renderStatus: (b: Booking) => React.ReactNode;
  renderAction?: (b: Booking) => React.ReactNode;
}

function BookingTable({
  title,
  emptyText,
  emptyAction,
  bookings,
  nameOf,
  renderStatus,
  renderAction,
}: BookingTableProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const columns = renderAction ? 4 : 3;
  const heading = (
    <Typography variant="h3" component="h3" gutterBottom>
      {title}
    </Typography>
  );

  // Phones: a list of cards. A 4-column table is unreadable at 375 px.
  if (isPhone) {
    return (
      <section>
        {heading}
        {bookings.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2, color: 'text.secondary' }}>
            {emptyText} {emptyAction}
          </Paper>
        ) : (
          <Stack
            component="ul"
            aria-label={title}
            spacing={1.5}
            sx={{ listStyle: 'none', p: 0, m: 0 }}
          >
            {bookings.map((b) => (
              <Paper component="li" key={b.id} variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 600 }}>{nameOf(b.resourceId)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {formatSlot(b.start, b.end)}
                </Typography>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  {renderStatus(b)}
                  {renderAction?.(b)}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </section>
    );
  }

  return (
    <section>
      {heading}
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
                <TableCell colSpan={columns} sx={{ color: 'text.secondary' }}>
                  {emptyText} {emptyAction}
                </TableCell>
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
