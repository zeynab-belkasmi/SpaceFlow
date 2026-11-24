import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { createBooking, getAvailabilities, listResources } from '../api/endpoints';
import { Availabilities, Resource } from '../api/types';
import { validateSlot } from '../booking/rules';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useNotify } from '../context/NotificationContext';
import { errorMessage, formatSlot, formatTime, toLocalDate } from '../format';

const STEPS = ['Resource', 'Time slot', 'Confirm'];

interface BookingPageProps {
  /** Resource chosen in the catalogue, if any. */
  initialResourceId?: string;
  onBooked: () => void;
}

/** Multi-step booking form (US-03) with real-time validation (US-07). */
export function BookingPage({ initialResourceId, onBooked }: BookingPageProps) {
  const { user } = useCurrentUser();
  const notify = useNotify();

  const [step, setStep] = useState(0);
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState(initialResourceId ?? '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [availabilities, setAvailabilities] = useState<Availabilities | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listResources({ status: 'AVAILABLE', pageSize: 100 })
      .then((page) => setResources(page.items))
      .catch((e: unknown) => setLoadError(errorMessage(e)));
  }, []);

  // Reload the free slots whenever the resource or the day changes.
  useEffect(() => {
    if (!resourceId || !date) {
      return;
    }
    let ignore = false;
    getAvailabilities(resourceId, date)
      .then((a) => !ignore && setAvailabilities(a))
      .catch(() => !ignore && setAvailabilities(null));
    return () => {
      ignore = true;
    };
  }, [resourceId, date]);

  // Derived on every render: no extra state to keep in sync.
  const start = toLocalDate(date, startTime);
  const end = toLocalDate(date, endTime);
  const problem = validateSlot({ start, end, role: user.role, now: new Date() });
  const resource = resources?.find((r) => r.id === resourceId);
  const canContinue = step === 0 ? Boolean(resource) : problem === null;

  const submit = async () => {
    if (!start || !end || !resource) {
      return;
    }
    setSubmitting(true);
    try {
      await createBooking({
        resourceId: resource.id,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      notify('Booking confirmed.');
      onBooked();
    } catch (e) {
      // The server has the last word (conflicts, active booking quota...).
      notify(errorMessage(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }
  if (!resources) {
    return <CircularProgress aria-label="Loading" />;
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 720 }}>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <RadioGroup
          aria-label="Resource"
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
        >
          {resources.length === 0 && <Typography>No resource is available.</Typography>}
          {resources.map((r) => (
            <FormControlLabel
              key={r.id}
              value={r.id}
              control={<Radio />}
              label={`${r.name} · ${r.category === 'ROOM' ? 'Room' : 'Equipment'} · capacity ${r.capacity}`}
            />
          ))}
        </RadioGroup>
      )}

      {step === 1 && (
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="time"
              label="Start time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="time"
              label="End time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          {problem && <Alert severity={start && end ? 'error' : 'info'}>{problem}</Alert>}

          {date && availabilities && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Free on this day (your local time):
              </Typography>
              {availabilities.free.length === 0 ? (
                <Typography variant="body2">Fully booked.</Typography>
              ) : (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {availabilities.free.map((slot) => (
                    <Chip
                      key={slot.start}
                      size="small"
                      label={`${formatTime(slot.start)} – ${formatTime(slot.end)}`}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      )}

      {step === 2 && resource && start && end && (
        <Stack spacing={1}>
          <Typography variant="overline">You are about to book</Typography>
          <Typography variant="h6">{resource.name}</Typography>
          <Typography>{formatSlot(start.toISOString(), end.toISOString())}</Typography>
        </Stack>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        {step > 0 && (
          <Button onClick={() => setStep(step - 1)} disabled={submitting}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button variant="contained" disabled={!canContinue} onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="contained" disabled={submitting} onClick={submit}>
            Confirm booking
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
