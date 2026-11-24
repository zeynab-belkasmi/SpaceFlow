import { useEffect, useState } from 'react';
import { listResources } from '../api/endpoints';

/**
 * Bookings only carry a `resourceId`: this hook loads the catalogue once and
 * returns a lookup function `nameOf(id)`.
 */
export function useResourceNames(): (id: string) => string {
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // `ignore` avoids updating state after the component is gone.
    let ignore = false;
    listResources({ pageSize: 100 })
      .then((page) => {
        if (!ignore) {
          setNames(new Map(page.items.map((r) => [r.id, r.name])));
        }
      })
      .catch(() => {
        // Names are a nicety: on failure we simply show the ids.
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (id) => names.get(id) ?? id;
}
