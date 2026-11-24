import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { CurrentUserProvider } from '../../src/context/CurrentUserContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import { BookingPage } from '../../src/pages/BookingPage';
import { booking, page, projector, roomA101, users } from '../fixtures';

jest.mock('../../src/api/endpoints');
const api = jest.mocked(endpoints);

// Local time, like the inputs of the form: 1 December 2026, 08:00.
const NOW = new Date(2026, 11, 1, 8, 0);

const renderPage = (props: { initialResourceId?: string } = {}) => {
  const onBooked = jest.fn();
  render(
    <NotificationProvider>
      <CurrentUserProvider>
        <BookingPage onBooked={onBooked} {...props} />
      </CurrentUserProvider>
    </NotificationProvider>,
  );
  return { onBooked };
};

/** Step 1 → step 2, then fills the slot inputs. */
const chooseRoomAndSlot = async (start: string, end: string) => {
  await userEvent.click(await screen.findByRole('radio', { name: /Room A101/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-12-01' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: end } });
};

describe('BookingPage (US-03, US-07)', () => {
  beforeEach(() => {
    // Fake "now", but timers keep running so user-event works normally.
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    localStorage.clear();
    api.listUsers.mockResolvedValue(users); // First user = the student.
    api.listResources.mockResolvedValue(page([roomA101, projector]));
    api.getAvailabilities.mockResolvedValue({
      resourceId: roomA101.id,
      date: '2026-12-01',
      status: 'AVAILABLE',
      busy: [],
      free: [{ start: '2026-12-01T00:00:00.000Z', end: '2026-12-02T00:00:00.000Z' }],
    });
  });

  afterEach(() => jest.useRealTimers());

  it('offers only available resources', async () => {
    renderPage();

    expect(await screen.findByRole('radio', { name: /Room A101/ })).toBeInTheDocument();
    expect(api.listResources).toHaveBeenCalledWith({ status: 'AVAILABLE', pageSize: 100 });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('preselects the resource chosen in the catalogue', async () => {
    renderPage({ initialResourceId: projector.id });

    expect(await screen.findByRole('radio', { name: /Projector #1/ })).toBeChecked();
  });

  it('validates the slot in real time with the rules of my role', async () => {
    renderPage();
    await chooseRoomAndSlot('10:00', '13:00');

    expect(
      screen.getByText('A student cannot book more than 2 hours at a time.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '11:00' } });

    expect(screen.queryByText(/cannot book more than/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('shows the free slots of the chosen day', async () => {
    renderPage();
    await chooseRoomAndSlot('10:00', '11:00');

    expect(api.getAvailabilities).toHaveBeenCalledWith(roomA101.id, '2026-12-01');
    expect(await screen.findByText(/Free on this day/)).toBeInTheDocument();
  });

  it('books after confirmation, then notifies and calls onBooked', async () => {
    api.createBooking.mockResolvedValue(booking());
    const { onBooked } = renderPage();
    await chooseRoomAndSlot('10:00', '11:00');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Room A101')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(api.createBooking).toHaveBeenCalledWith({
      resourceId: roomA101.id,
      start: new Date(2026, 11, 1, 10, 0).toISOString(),
      end: new Date(2026, 11, 1, 11, 0).toISOString(),
    });
    expect(await screen.findByText('Booking confirmed.')).toBeInTheDocument();
    expect(onBooked).toHaveBeenCalled();
  });

  it('shows the server refusal (e.g. a conflict) and stays on the form', async () => {
    api.createBooking.mockRejectedValue(
      new ApiError(409, 'SLOT_CONFLICT', 'Room A101 is already booked on this slot.'),
    );
    const { onBooked } = renderPage();
    await chooseRoomAndSlot('10:00', '11:00');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await userEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(
      await screen.findByText('Room A101 is already booked on this slot.'),
    ).toBeInTheDocument();
    expect(onBooked).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });
});
