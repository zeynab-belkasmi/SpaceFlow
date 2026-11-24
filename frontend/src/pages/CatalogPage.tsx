import AddOutlined from '@mui/icons-material/AddOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { createResource, listResources, ResourceQuery, updateResource } from '../api/endpoints';
import { Page, Resource, ResourceCategory, ResourceStatus } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useNotify } from '../context/NotificationContext';
import { errorMessage } from '../format';

interface CatalogPageProps {
  onBook: (resource: Resource) => void;
}

/** Resource catalogue (US-01) with server-side filters and pagination; admin actions (US-02). */
export function CatalogPage({ onBook }: CatalogPageProps) {
  const { user } = useCurrentUser();
  const notify = useNotify();
  const isAdmin = user.role === 'ADMIN';
  // On phones, secondary columns are hidden so that Status and the Book action stay visible.
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));

  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [status, setStatus] = useState<ResourceStatus | ''>('');
  const [minCapacity, setMinCapacity] = useState('');
  // DataGrid pages start at 0, the API at 1.
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Incremented after an admin change to reload the current page.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  // The query is derived from the filters (no state to keep in sync). useMemo keeps the
  // same object while the filters do not change, so the effect below does not re-run.
  const query = useMemo(() => {
    const q: ResourceQuery = { page: pagination.page + 1, pageSize: pagination.pageSize };
    if (category) q.category = category;
    if (status) q.status = status;
    if (Number(minCapacity) >= 1) q.minCapacity = Number(minCapacity);
    return q;
  }, [category, status, minCapacity, pagination]);
  const requestKey = `${JSON.stringify(query)}#${version}`;

  // We remember WHICH request the data answers. "Loading" is then derived:
  // the data on screen does not match the current request yet.
  const [loaded, setLoaded] = useState<{ key: string; page: Page<Resource> } | null>(null);
  const loading = loaded?.key !== requestKey;

  useEffect(() => {
    let ignore = false;
    listResources(query)
      .then((page) => {
        if (ignore) return;
        setLoaded({ key: requestKey, page });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!ignore) setError(errorMessage(e));
      });
    return () => {
      ignore = true;
    };
  }, [query, requestKey]);
  const data = loaded?.page;

  // Changing a filter goes back to the first page.
  const filterChanged =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPagination((p) => ({ ...p, page: 0 }));
    };

  const toggleMaintenance = async (resource: Resource) => {
    const next: ResourceStatus = resource.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await updateResource(resource.id, { status: next });
      notify(`${resource.name} is now ${next === 'AVAILABLE' ? 'available' : 'in maintenance'}.`);
      reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const columns: GridColDef<Resource>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: isPhone ? 100 : 140 },
    {
      field: 'category',
      headerName: 'Category',
      width: 130,
      valueFormatter: (value: ResourceCategory) => (value === 'ROOM' ? 'Room' : 'Equipment'),
    },
    { field: 'capacity', headerName: 'Capacity', type: 'number', width: 110 },
    {
      field: 'status',
      headerName: 'Status',
      width: isPhone ? 118 : 140,
      renderCell: ({ row }) => <StatusChip status={row.status} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: isAdmin ? 290 : isPhone ? 84 : 110,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            // Text only on phones, to fit the column; the icon is decorative anyway.
            {...(!isPhone && { startIcon: <EventAvailableOutlined aria-hidden /> })}
            disabled={row.status !== 'AVAILABLE'}
            onClick={() => onBook(row)}
            // Visible text "Book" is the same on every row; the accessible name is not.
            aria-label={`Book ${row.name}`}
          >
            Book
          </Button>
          {isAdmin && (
            <Button
              size="small"
              color="warning"
              startIcon={
                row.status === 'AVAILABLE' ? (
                  <BuildOutlined aria-hidden />
                ) : (
                  <CheckCircleOutlined aria-hidden />
                )
              }
              onClick={() => toggleMaintenance(row)}
              aria-label={`${row.status === 'AVAILABLE' ? 'Set maintenance' : 'Set available'}: ${row.name}`}
            >
              {row.status === 'AVAILABLE' ? 'Set maintenance' : 'Set available'}
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <PageHeader title="Catalog">
        Rooms and equipment you can book. Filter the list, then choose “Book”.
      </PageHeader>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        // Full-width fields on phones, a single row on larger screens.
        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <TextField
          select
          size="small"
          label="Category"
          value={category}
          onChange={(e) => filterChanged(setCategory)(e.target.value as ResourceCategory | '')}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: { sm: 160 } }}
        >
          <option value="">All</option>
          <option value="ROOM">Room</option>
          <option value="EQUIPMENT">Equipment</option>
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => filterChanged(setStatus)(e.target.value as ResourceStatus | '')}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: { sm: 160 } }}
        >
          <option value="">All</option>
          <option value="AVAILABLE">Available</option>
          <option value="MAINTENANCE">Maintenance</option>
        </TextField>
        <TextField
          size="small"
          type="number"
          label="Min. capacity"
          value={minCapacity}
          onChange={(e) => filterChanged(setMinCapacity)(e.target.value)}
          slotProps={{ htmlInput: { min: 1, inputMode: 'numeric' } }}
          sx={{ width: { sm: 150 } }}
        />
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddOutlined aria-hidden />}
            onClick={() => setCreating(true)}
            sx={{ ml: { sm: 'auto' } }}
          >
            New resource
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        <DataGrid
          aria-label="Resources"
          rows={data?.items ?? []}
          columns={columns}
          loading={loading}
          paginationMode="server"
          rowCount={data?.total ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[5, 10, 20]}
          columnVisibilityModel={{ category: !isPhone, capacity: !isPhone }}
          disableRowSelectionOnClick
          autoHeight
        />
      </Paper>

      <NewResourceDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(name) => {
          setCreating(false);
          notify(`${name} created.`);
          reload();
        }}
      />
    </Stack>
  );
}

interface NewResourceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

function NewResourceDialog({ open, onClose, onCreated }: NewResourceDialogProps) {
  const notify = useNotify();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('ROOM');
  const [capacity, setCapacity] = useState('1');

  const submit = async () => {
    try {
      const created = await createResource({ name, category, capacity: Number(capacity) });
      setName('');
      setCapacity('1');
      onCreated(created.name);
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New resource</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ResourceCategory)}
            slotProps={{ select: { native: true } }}
          >
            <option value="ROOM">Room</option>
            <option value="EQUIPMENT">Equipment</option>
          </TextField>
          <TextField
            type="number"
            label="Capacity"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
