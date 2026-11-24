import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../src/api/endpoints';
import { App } from '../src/App';
import { CurrentUserProvider } from '../src/context/CurrentUserContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { admin, roomA101, users } from './fixtures';

jest.mock('../src/api/endpoints');
const api = jest.mocked(endpoints);

// Pages are replaced by stubs: this test is only about navigation.
jest.mock('../src/pages/CatalogPage', () => ({
  CatalogPage: ({ onBook }: { onBook: (r: typeof roomA101) => void }) => (
    <button onClick={() => onBook(roomA101)}>Stub: book Room A101</button>
  ),
}));
jest.mock('../src/pages/BookingPage', () => ({
  BookingPage: ({ initialResourceId }: { initialResourceId?: string }) => (
    <p>Stub booking form for {initialResourceId ?? 'nothing'}</p>
  ),
}));
jest.mock('../src/pages/DashboardPage', () => ({ DashboardPage: () => <p>Stub dashboard</p> }));
jest.mock('../src/pages/AdminPage', () => ({ AdminPage: () => <p>Stub admin</p> }));

const renderApp = () =>
  render(
    <NotificationProvider>
      <CurrentUserProvider>
        <App />
      </CurrentUserProvider>
    </NotificationProvider>,
  );

describe('App navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    api.listUsers.mockResolvedValue(users);
  });

  it('opens the section named in the URL (deep link) and keeps the URL in sync', async () => {
    window.location.hash = '#mine';
    renderApp();

    expect(await screen.findByText('Stub dashboard')).toBeInTheDocument();
    expect(document.title).toBe('My bookings · SpaceFlow');

    await userEvent.click(screen.getByRole('tab', { name: 'Catalog' }));
    expect(window.location.hash).toBe('#catalog');
  });

  it('falls back to the catalog when a non-admin opens #admin', async () => {
    window.location.hash = '#admin';
    renderApp();

    expect(await screen.findByRole('button', { name: 'Stub: book Room A101' })).toBeInTheDocument();
    expect(screen.queryByText('Stub admin')).not.toBeInTheDocument();
  });

  it('shows the Admin tab to admins only', async () => {
    renderApp();
    await screen.findByRole('tab', { name: 'Catalog' });
    expect(screen.queryByRole('tab', { name: 'Admin' })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Signed in as'), admin.id);
    await userEvent.click(screen.getByRole('tab', { name: 'Admin' }));

    expect(screen.getByText('Stub admin')).toBeInTheDocument();
  });

  it('opens the booking form with the resource chosen in the catalogue', async () => {
    renderApp();

    await userEvent.click(await screen.findByRole('button', { name: 'Stub: book Room A101' }));

    expect(screen.getByRole('tab', { name: 'Book' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(`Stub booking form for ${roomA101.id}`)).toBeInTheDocument();
  });

  it('navigates between sections with the tabs', async () => {
    renderApp();

    await userEvent.click(await screen.findByRole('tab', { name: 'My bookings' }));
    expect(screen.getByText('Stub dashboard')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Book' }));
    expect(screen.getByText('Stub booking form for nothing')).toBeInTheDocument();
  });
});
