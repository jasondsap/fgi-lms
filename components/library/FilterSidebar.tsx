'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  RESOURCE_TYPE_LABELS, AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS, FILTER_GROUPS,
} from '@/types';

interface Props {
  total: number;
  targetPath?: string;
  /** True on a tenant portal — controls the Certification Info group. */
  isTenant?: boolean;
  /**
   * Tenant portals: link to the FGI main library, rendered as an
   * "Other Libraries" block at the foot of the sidebar (Jennifer, 8-25).
   */
  fgiLibraryHref?: string;
  /** Label for that link — "Fletcher Group Library" on a tenant's own library,
      "SCARR Library" (etc.) when the tenant is browsing the FGI catalogue. */
  fgiLibraryLabel?: string;
  /** Open the other-library link in a new tab (the tenant → FGI direction). */
  fgiLibraryNewTab?: boolean;
}

/**
 * 8-30-26 (Jason/Jennifer): a tenant's "Fletcher Group Library" link opens
 * the real FGI library in a new tab with ?from=<tenant>; this remembers the
 * origin for the tab's lifetime so the FGI sidebar can offer the way back
 * even after filtering churns the query string.
 */
const RETURN_TENANTS: Record<string, { label: string; href: string }> = {
  scarr:    { label: 'SCARR Library',    href: '/scarr/library' },
  colorado: { label: 'Colorado Library', href: '/colorado/library' },
};

const LABEL_MAPS: Record<string, Record<string, string>> = {
  type:     RESOURCE_TYPE_LABELS,
  audience: AUDIENCE_TAG_LABELS,
  topic:    TOPIC_TAG_LABELS,
};

/**
 * Accordion filter group. Collapsed by default (per Jennifer's 7-18-26 mockup);
 * a group that already has an active filter opens itself so the selection stays
 * visible after the filter navigation re-renders the sidebar.
 */
function FilterGroup({
  title, defaultOpen = false, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid var(--border-color)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', gap: '8px', background: 'none', border: 'none',
          padding: '13px 0', textAlign: 'left', fontFamily: 'inherit',
          fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
        }}
      >
        {title}
        <svg
          width="18" height="11" viewBox="0 0 18 11" aria-hidden="true"
          style={{
            flexShrink: 0, transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <path d="M1 1l8 8 8-8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && <div style={{ paddingBottom: '12px' }}>{children}</div>}
    </div>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: '7px', cursor: 'pointer',
      marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.35,
    }}>
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ marginTop: '2px', accentColor: 'var(--fgi-blue)', flexShrink: 0 }} />
      {label}
    </label>
  );
}

export default function FilterSidebar({
  total, targetPath, isTenant = false, fgiLibraryHref, fgiLibraryLabel, fgiLibraryNewTab = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dest = targetPath || pathname;

  // Phone/tablet (9-5-26): the sidebar is a full-screen drawer behind a
  // "Filters" pill. CSS (.filter-sidebar--open) does the layout; this just
  // tracks open state and locks the page scroll while it's up.
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [drawer]);

  const toggle = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'collection') {
      // A collection is a single curated view, not a multi-select facet.
      if (params.get('collection') === value) params.delete('collection');
      else params.set('collection', value);
    } else {
      const current = params.getAll(key);
      params.delete(key);
      if (current.includes(value)) {
        current.filter(v => v !== value).forEach(v => params.append(key, v));
      } else {
        [...current, value].forEach(v => params.append(key, v));
      }
    }
    params.set('page', '1');
    params.delete('loaded'); // depth stamp belongs to the previous result set
    // scroll: false keeps the visitor where they are in the library instead
    // of snapping to the top of the page on every filter change.
    router.push(`${dest}?${params.toString()}`, { scroll: false });
  }, [router, dest, searchParams]);

  const clearAll = useCallback(() => { router.push(dest, { scroll: false }); }, [router, dest]);

  // FGI side of the new-tab flow: remember which tenant opened this tab.
  const [returnTenant, setReturnTenant] = useState<{ label: string; href: string } | null>(null);
  useEffect(() => {
    if (isTenant) return;
    try {
      const fromParam = searchParams.get('from');
      const slug = fromParam && RETURN_TENANTS[fromParam]
        ? fromParam
        : sessionStorage.getItem('fgi-from-tenant');
      if (fromParam && RETURN_TENANTS[fromParam]) sessionStorage.setItem('fgi-from-tenant', fromParam);
      if (slug && RETURN_TENANTS[slug]) setReturnTenant(RETURN_TENANTS[slug]);
    } catch { /* private mode */ }
  }, [isTenant, searchParams]);

  // Close the tab the tenant opened; if the browser refuses (direct visit,
  // same-tab navigation), fall back to plainly going there.
  const returnToTenant = useCallback((e: React.MouseEvent, href: string) => {
    e.preventDefault();
    window.close();
    setTimeout(() => { window.location.href = href; }, 150);
  }, []);

  const active: Record<string, string[]> = {
    type:       searchParams.getAll('type'),
    audience:   searchParams.getAll('audience'),
    topic:      searchParams.getAll('topic'),
    collection: searchParams.getAll('collection'),
  };
  const hasFilters = active.type.length || active.audience.length || active.topic.length
    || active.collection.length || searchParams.get('duration');

  // Normalise every item to {param, value, label} so a group can mix its own
  // facet with a collection checkbox (the tenants' "Required Videos").
  const groups = FILTER_GROUPS
    .filter(g => (!g.tenantOnly || isTenant) && !(g.hideOnTenant && isTenant))
    .map(g => {
      const labels = LABEL_MAPS[g.param];
      const items = g.items
        .map(i => (typeof i === 'string'
          ? {
              param: g.param, value: i,
              label: (isTenant && g.tenantLabels?.[i]) || g.labels?.[i] || labels[i] || i,
            }
          : i))
        .filter(i => !(isTenant && g.excludeOnTenant?.includes(i.value)))
        .filter(i => isTenant || !('tenantOnly' in i && i.tenantOnly));
      return { title: g.title, items };
    })
    .filter(g => g.items.length > 0);

  const activeCount = active.type.length + active.audience.length + active.topic.length
    + active.collection.length;

  return (
    <>
    <button type="button" className="filter-toggle" onClick={() => setDrawer(true)} aria-expanded={drawer}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <path d="M3 6h18M6 12h12M10 18h4" />
      </svg>
      Filters{activeCount ? ` (${activeCount})` : ''}
    </button>
    <aside className={`filter-sidebar${drawer ? ' filter-sidebar--open' : ''}`}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: '8px', marginBottom: '6px',
      }}>
        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> results
        </span>
        {hasFilters ? (
          <button onClick={clearAll} style={{
            fontSize: '11px', color: 'var(--fgi-blue)', background: 'none',
            border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline',
            flexShrink: 0,
          }}>Clear all</button>
        ) : null}
      </div>
      {drawer && (
        <button
          type="button"
          onClick={() => setDrawer(false)}
          aria-label="Close filters"
          style={{
            position: 'absolute', top: '10px', right: '14px', width: '36px', height: '36px',
            border: 'none', background: 'transparent', fontSize: '26px', lineHeight: 1,
            color: 'var(--text-secondary)',
          }}
        >
          ×
        </button>
      )}

      {groups.map(group => (
        <FilterGroup
          key={group.title}
          title={group.title}
          defaultOpen={group.items.some(i => active[i.param].includes(i.value))}
        >
          {group.items.map(item => (
            <CheckItem
              key={`${item.param}:${item.value}`}
              label={item.label}
              checked={active[item.param].includes(item.value)}
              onChange={() => toggle(item.param, item.value)}
            />
          ))}
        </FilterGroup>
      ))}

      {/* Tenant side: "Fletcher Group Library", into a new tab. Accordion like
          the filter groups above (Jason, 8-31-26). */}
      {fgiLibraryHref && (
        <FilterGroup title="Other Libraries">
          <a
            href={fgiLibraryHref}
            target={fgiLibraryNewTab ? '_blank' : undefined}
            style={{ fontSize: '13px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}
          >
            {fgiLibraryLabel ?? 'Fletcher Group Library'}
          </a>
        </FilterGroup>
      )}

      {/* FGI side: the library this tab was opened from — clicking closes the
          tab and lands the visitor back where they were. */}
      {!isTenant && !fgiLibraryHref && returnTenant && (
        <FilterGroup title="Other Libraries">
          <a
            href={returnTenant.href}
            onClick={(e) => returnToTenant(e, returnTenant.href)}
            style={{ fontSize: '13px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}
          >
            {returnTenant.label}
          </a>
        </FilterGroup>
      )}

      <button type="button" className="filter-close" onClick={() => setDrawer(false)}>
        Show {total} result{total === 1 ? '' : 's'}
      </button>
    </aside>
    </>
  );
}
