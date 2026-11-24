import {
  Alert,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { listAllBookings, listAuditLogs } from '../api/endpoints';
import { AuditLog, Booking } from '../api/types';
import { LoadingRows } from '../components/LoadingRows';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';
import { useCurrentUser } from '../context/CurrentUserContext';
import { errorMessage, formatDateTime, formatSlot } from '../format';
import { useResourceNames } from '../hooks/useResourceNames';

const ACTION_LABEL = {
  BOOKING_CONFIRMED: 'Booking confirmed',
  BOOKING_CANCELLED: 'Booking cancelled',
};

/** Admin only: full booking history and audit log. */
export function AdminPage() {
  const { users } = useCurrentUser();
  const nameOf = useResourceNames();
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listAllBookings(), listAuditLogs()])
      .then(([b, l]) => {
        setBookings(b);
        setLogs(l);
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  const header = (
    <PageHeader title="Administration">
      Every booking made on the platform, and the audit log of confirmations and cancellations.
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
  if (!bookings || !logs) {
    return (
      <>
        {header}
        <LoadingRows label="Loading history" />
      </>
    );
  }

  return (
    <>
      {header}
      <Tabs value={tab} onChange={(_e, value: number) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label={`All bookings (${bookings.length})`} />
        <Tab label={`Audit log (${logs.length})`} />
      </Tabs>

      <TableContainer component={Paper} variant="outlined">
        {tab === 0 ? (
          <Table size="small" aria-label="All bookings">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Slot</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{userName(b.userId)}</TableCell>
                  <TableCell>{nameOf(b.resourceId)}</TableCell>
                  <TableCell>{formatSlot(b.start, b.end)}</TableCell>
                  <TableCell>
                    <StatusChip status={b.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table size="small" aria-label="Audit log">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>By</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Booking</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatDateTime(l.occurredAt)}</TableCell>
                  <TableCell>{ACTION_LABEL[l.action]}</TableCell>
                  <TableCell>{userName(l.actorId)}</TableCell>
                  <TableCell>{nameOf(l.resourceId)}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {l.bookingId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </>
  );
}
