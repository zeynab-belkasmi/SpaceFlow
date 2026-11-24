import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import MeetingRoomOutlined from '@mui/icons-material/MeetingRoomOutlined';
import { AppBar, Box, Container, Link, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { lazy, ReactElement, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { LoadingRows } from './components/LoadingRows';
import { UserPicker } from './components/UserPicker';
import { useCurrentUser } from './context/CurrentUserContext';

// Code splitting: each page (and the libraries only it uses, like the DataGrid) becomes
// its own file, downloaded the first time the page is opened.
const CatalogPage = lazy(() =>
  import('./pages/CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
const BookingPage = lazy(() =>
  import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

type Section = 'catalog' | 'book' | 'mine' | 'admin';

const SECTIONS: Record<Section, { label: string; icon: ReactElement; adminOnly?: boolean }> = {
  catalog: { label: 'Catalog', icon: <Inventory2Outlined /> },
  book: { label: 'Book', icon: <EventAvailableOutlined /> },
  mine: { label: 'My bookings', icon: <EventNoteOutlined /> },
  admin: { label: 'Admin', icon: <AdminPanelSettingsOutlined />, adminOnly: true },
};

export function App() {
  const { user } = useCurrentUser();
  return (
    <>
      {/* First focusable element: keyboard users can jump over the navigation. */}
      <Link
        href="#content"
        sx={{
          position: 'absolute',
          left: 8,
          top: -48,
          zIndex: 'tooltip',
          p: 1,
          bgcolor: 'background.paper',
          '&:focus': { top: 8 },
        }}
      >
        Skip to content
      </Link>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2, py: 1 }}>
          <MeetingRoomOutlined aria-hidden />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 700 }}>
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

/** The URL hash (#book, #mine...) is the current section: deep links and Back both work. */
function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function useSection(isAdmin: boolean): [Section, (s: Section) => void] {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash.slice(1));
  const known = hash in SECTIONS ? (hash as Section) : 'catalog';
  // An unknown hash, or #admin for a non-admin, falls back to the catalog.
  const section = SECTIONS[known].adminOnly && !isAdmin ? 'catalog' : known;
  const go = (next: Section) => {
    window.location.hash = next; // Adds a history entry, so the Back button returns here.
  };
  return [section, go];
}

function Workspace({ isAdmin }: { isAdmin: boolean }) {
  const [section, go] = useSection(isAdmin);
  const [bookResourceId, setBookResourceId] = useState<string | undefined>(undefined);

  // The browser tab title tells where you are (also read first by screen readers).
  useEffect(() => {
    document.title = `${SECTIONS[section].label} · SpaceFlow`;
  }, [section]);

  const visible = (Object.keys(SECTIONS) as Section[]).filter(
    (s) => isAdmin || !SECTIONS[s].adminOnly,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Tabs
        value={section}
        onChange={(_e, value: Section) => go(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Sections"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {visible.map((s) => (
          <Tab
            key={s}
            value={s}
            label={SECTIONS[s].label}
            icon={SECTIONS[s].icon}
            iconPosition="start"
            id={`tab-${s}`}
            aria-controls="content"
          />
        ))}
      </Tabs>

      <Box component="main" id="content" role="tabpanel" aria-labelledby={`tab-${section}`}>
        {/* Shown while a page's code is downloading. */}
        <Suspense fallback={<LoadingRows label="Loading page" />}>
          {section === 'catalog' && (
            <CatalogPage
              onBook={(resource) => {
                setBookResourceId(resource.id);
                go('book');
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
                go('mine');
              }}
            />
          )}
          {section === 'mine' && <DashboardPage onBrowseCatalog={() => go('catalog')} />}
          {section === 'admin' && <AdminPage />}
        </Suspense>
      </Box>
    </Container>
  );
}
