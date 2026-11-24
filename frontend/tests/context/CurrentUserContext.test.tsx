import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../../src/api/endpoints';
import { ApiError, getCurrentUserId } from '../../src/api/client';
import { UserPicker } from '../../src/components/UserPicker';
import { CurrentUserProvider, useCurrentUser } from '../../src/context/CurrentUserContext';
import { faculty, student, users } from '../fixtures';

// Replaces every function of the module with a jest.fn(): no HTTP call in these tests.
jest.mock('../../src/api/endpoints');
const api = jest.mocked(endpoints);

function WhoAmI() {
  const { user } = useCurrentUser();
  return <p>Current: {user.name}</p>;
}

const renderApp = () =>
  render(
    <CurrentUserProvider>
      <UserPicker />
      <WhoAmI />
    </CurrentUserProvider>,
  );

describe('CurrentUserProvider + UserPicker', () => {
  beforeEach(() => {
    localStorage.clear();
    api.listUsers.mockResolvedValue(users);
  });

  it('signs in as the first user by default and sends their id to the API', async () => {
    renderApp();

    expect(await screen.findByText('Current: Alice Martin')).toBeInTheDocument();
    expect(getCurrentUserId()).toBe(student.id);
  });

  it('switches user, remembers the choice and updates the API header', async () => {
    renderApp();
    const picker = await screen.findByLabelText('Signed in as');

    await userEvent.selectOptions(picker, faculty.id);

    expect(screen.getByText('Current: Bruno Silva')).toBeInTheDocument();
    expect(localStorage.getItem('spaceflow.userId')).toBe(faculty.id);
    expect(getCurrentUserId()).toBe(faculty.id);
  });

  it('restores the remembered user on the next visit', async () => {
    localStorage.setItem('spaceflow.userId', faculty.id);

    renderApp();

    expect(await screen.findByText('Current: Bruno Silva')).toBeInTheDocument();
  });

  it('falls back to the first user if the remembered one no longer exists', async () => {
    localStorage.setItem('spaceflow.userId', 'deleted-user');

    renderApp();

    expect(await screen.findByText('Current: Alice Martin')).toBeInTheDocument();
  });

  it('shows the error and lets the user retry when the API is down', async () => {
    api.listUsers.mockRejectedValueOnce(
      new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the backend running?'),
    );

    renderApp();

    expect(
      await screen.findByText('Cannot reach the server. Is the backend running?'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Current: Alice Martin')).toBeInTheDocument();
  });
});
