import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';
import { UserPicker } from './components/UserPicker';
import { useCurrentUser } from './context/CurrentUserContext';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { CatalogPage } from './pages/CatalogPage';
import { DashboardPage } from './pages/DashboardPage';

type Section = 'catalog' | 'book' | 'mine' | 'admin';

export function App() {
  const { user } = useCurrentUser();
  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            SpaceFlow
          </Typography>
          <UserPicker />
        </Toolbar>
      </AppBar>
      {/* `key`: switching user remounts everything, so no page shows the previous user's data. */}
      <Workspace key={user.id} isAdmin={user.role === 'ADMIN'} />
    </>
  );
}

function Workspace({ isAdmin }: { isAdmin: boolean }) {
  const [section, setSection] = useState<Section>('catalog');
  const [bookResourceId, setBookResourceId] = useState<string | undefined>(undefined);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Tabs
        value={section}
        onChange={(_e, value: Section) => setSection(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="catalog" label="Catalog" />
        <Tab value="book" label="Book" />
        <Tab value="mine" label="My bookings" />
        {isAdmin && <Tab value="admin" label="Admin" />}
      </Tabs>

      <Box component="main">
        {section === 'catalog' && (
          <CatalogPage
            onBook={(resource) => {
              setBookResourceId(resource.id);
              setSection('book');
            }}
          />
        )}
        {section === 'book' && (
          <BookingPage
            // A new key when the preselected resource changes resets the form.
            key={bookResourceId ?? 'none'}
            {...(bookResourceId !== undefined && { initialResourceId: bookResourceId })}
            onBooked={() => {
              setBookResourceId(undefined);
              setSection('mine');
            }}
          />
        )}
        {section === 'mine' && <DashboardPage />}
        {section === 'admin' && isAdmin && <AdminPage />}
      </Box>
    </Container>
  );
}
