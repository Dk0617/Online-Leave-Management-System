import { useMemo, useState } from "react";

// Generalizes the "does this row match the search box" check that used to
// be copy-pasted as a local `matchesSearch` function in hod/views.tsx and
// troop/views.tsx (3 near-identical copies) — a row matches if any of the
// given fields contains the query as a case-insensitive substring. `fields`
// is called fresh per row per render; table datasets here are small
// (client-resident, no pagination anywhere in the app), so this isn't
// worth memoizing further.
export function useSearchFilter<T>(items: T[], fields: (item: T) => Array<string | undefined | null>) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => fields(item).some((value) => (value ?? "").toLowerCase().includes(q)));
  }, [items, query, fields]);
  return { query, setQuery, filtered };
}

export type SortDirection = "asc" | "desc";

// Tracks which column a table is sorted by and in which direction. Doesn't
// store the value-accessor itself (storing functions in React state is an
// easy source of bugs — setState treats a bare function as a lazy
// initializer) — callers instead pass their own column->accessor map to
// `sortRows` below, computed in their own `useMemo`.
export function useSort(initialKey?: string, initialDir: SortDirection = "asc") {
  const [sortKey, setSortKey] = useState<string | undefined>(initialKey);
  const [sortDir, setSortDir] = useState<SortDirection>(initialDir);

  function toggleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return { sortKey, sortDir, toggleSort };
}

// Sorts `items` by whichever column is active, using the caller-supplied
// accessor for that column. Returns `items` unchanged if nothing is sorted
// yet or the active key has no matching accessor (e.g. a column that isn't
// sortable).
export function sortRows<T>(
  items: T[],
  sortKey: string | undefined,
  sortDir: SortDirection,
  accessors: Record<string, (item: T) => string | number>
): T[] {
  if (!sortKey || !accessors[sortKey]) return items;
  const getValue = accessors[sortKey];
  const sorted = [...items].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return sortDir === "asc" ? sorted : sorted.reverse();
}
