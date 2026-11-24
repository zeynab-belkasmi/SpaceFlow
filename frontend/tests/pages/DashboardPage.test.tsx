import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { NotificationProvider } from '../../src/context/NotificationContext';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { booking, page, projector, resources, roomA101 } from '../fixtures';

jest.mock('../../src/api/endpoints');
const api = jest.mocked(endpoints);

const upcoming = booking({ id: 'upcoming', resourceId: roomA101.id });
const past = booking({
  id: 'past',
  resourceId: projector.id,
  start: '2020-01-10T10:00:00.000Z',
  end: '2020-01-10T11:00:00.000Z',
});
const cancelled = booking({ id: 'cancelled', status: 'CANCELLED' });

const renderPage = () =>
  render(
    <NotificationProvider>
      <DashboardPage />
    </NotificationProvider>,
  );

describe('DashboardPage (US-08)', () => {
  beforeEach(() => {
    api.listResources.mockResolvedValue(page(resources));
    api.listMyBookings.mockResolvedValue([upcoming, past, cancelled]);
  });

  it('splits my bookings into upcoming and history, with resource names', async () => {
    renderPage();

    const upcomingTable = await screen.findByRole('table', { name: 'Upcoming bookings' });
    expect(within(upcomingTable).getAllByRole('row')).toHaveLength(2); // header + 1
    expect(within(upcomingTable).getByText('Room A101')).toBeInTheDocument();

    const history = screen.getByRole('table', { name: 'Booking history' });
    expect(within(history).getByText('Projector #1')).toBeInTheDocument();
    expect(within(history).getByText('Cancelled')).toBeInTheDocument();
    expect(within(history).getByText('Done')).toBeInTheDocument();
  });

  it('cancels a booking in one click and refreshes the list', async () => {
    api.cancelBooking.mockResolvedValue({ ...upcoming, status: 'CANCELLED' });
    renderPage();
    const upcomingTable = await screen.findByRole('table', { name: 'Upcoming bookings' });

    api.listMyBookings.mockResolvedValue([{ ...upcoming, status: 'CANCELLED' }, past, cancelled]);
    await userEvent.click(
      within(upcomingTable).getByRole('button', { name: /^Cancel booking: Room A101/ }),
    );

    expect(api.cancelBooking).toHaveBeenCalledWith('upcoming');
    expect(await screen.findByText('Booking cancelled.')).toBeInTheDocument();
    expect(await screen.findByText('No upcoming booking.')).toBeInTheDocument();
  });

  it('shows the server message when the cancellation is refused', async () => {
    api.cancelBooking.mockRejectedValue(
      new ApiError(
        400,
        'INVALID_BOOKING_STATE',
        'A booking cannot be cancelled once it has started.',
      ),
    );
    renderPage();
    const upcomingTable = await screen.findByRole('table', { name: 'Upcoming bookings' });

    await userEvent.click(
      within(upcomingTable).getByRole('button', { name: /^Cancel booking: Room A101/ }),
    );

    expect(
      await screen.findByText('A booking cannot be cancelled once it has started.'),
    ).toBeInTheDocument();
  });

  it('shows cards instead of tables on phones', async () => {
    // jsdom has no matchMedia: pretend every media query matches (= small screen).
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    renderPage();

    const upcomingList = await screen.findByRole('list', { name: 'Upcoming bookings' });
    expect(within(upcomingList).getByText('Room A101')).toBeInTheDocument();
    expect(
      within(upcomingList).getByRole('button', { name: /^Cancel booking: Room A101/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // @ts-expect-error restore jsdom's default (no matchMedia) for the other tests
    delete window.matchMedia;
  });

  it('shows an empty state when I have no booking', async () => {
    api.listMyBookings.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No upcoming booking.')).toBeInTheDocument();
    expect(screen.getByText('No past booking.')).toBeInTheDocument();
  });

  it('shows an error when the bookings cannot be loaded', async () => {
    api.listMyBookings.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Server down.'));
    renderPage();

    expect(await screen.findByText('Server down.')).toBeInTheDocument();
  });
});
