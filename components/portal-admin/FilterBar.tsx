// =============================================================================
// Portal Admin filter form (Jennifer's list, 9-19-26): date range, item,
// completion, organization, user, county, zip, "I am a". Single, multi-select
// and any combination. A plain GET form — server-rendered page, shareable URL,
// and the export links reuse the same query string. Server-safe: the only
// client piece is MultiPick.
// =============================================================================
import Link from 'next/link';
import {
  DATE_FIELDS, hasFilters, type ItemOption, type PortalFilters,
} from '@/lib/portal-admin';
import { RESOURCE_TYPE_LABELS, USER_ROLE_LABELS, type ResourceType, type UserRole } from '@/types';
import MultiPick from './MultiPick';

const FIELD: React.CSSProperties = {
  padding: '8px 12px', fontSize: '13.5px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
  background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px',
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-muted)',
};

export default function FilterBar({
  action, tab, filters, items, zips, accent, portalName,
}: {
  action: string;
  tab: string;
  filters: PortalFilters;
  items: ItemOption[];
  zips: Array<{ zip: string; n: number }>;
  accent: string;
  portalName: string;
}) {
  return (
    <form
      // Uncontrolled inputs keep their DOM value across a same-route
      // navigation, so "Clear filters" must remount the whole form.
      key={JSON.stringify(filters)}
      method="get"
      action={action}
      className="no-print"
      style={{
        background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '14px 16px',
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end',
      }}
    >
      <input type="hidden" name="tab" value={tab} />

      <label style={{ ...LABEL, flex: '1 1 170px' }}>
        User
        <input type="search" name="q" defaultValue={filters.q} placeholder="Name or email" style={FIELD} />
      </label>
      <label style={{ ...LABEL, flex: '1 1 170px' }}>
        Organization
        <input type="search" name="org" defaultValue={filters.org} placeholder="Contains…" style={FIELD} />
      </label>
      <label style={{ ...LABEL, flex: '1 1 130px' }}>
        County
        <input type="search" name="county" defaultValue={filters.county} placeholder="Contains…" style={FIELD} />
      </label>

      <div style={LABEL}>
        Zip
        <MultiPick
          // key: "Clear filters" is a same-route navigation — remount so the picks reset.
          key={`zip:${filters.zips.join(',')}`}
          name="zip" label="Zip codes" accent={accent} searchable
          selected={filters.zips.map((z) => z.slice(0, 5))}
          options={zips.map((z) => ({ value: z.zip, label: z.zip, hint: `${z.n} user${z.n === 1 ? '' : 's'}` }))}
        />
      </div>
      <div style={LABEL}>
        I am a…
        <MultiPick
          key={`role:${filters.roles.join(',')}`}
          name="role" label="Roles" accent={accent}
          selected={filters.roles}
          options={(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: USER_ROLE_LABELS[r] }))}
        />
      </div>
      <div style={LABEL}>
        Item
        <MultiPick
          key={`item:${filters.items.join(',')}`}
          name="item" label="Items" accent={accent} searchable
          selected={filters.items}
          options={items.map((i) => ({
            value: i.id,
            label: i.title,
            hint: [
              RESOURCE_TYPE_LABELS[i.type as ResourceType] ?? i.type,
              i.course_code,
              i.on_portal ? null : 'Fletcher Group Library',
            ].filter(Boolean).join(' · '),
          }))}
        />
      </div>

      <label style={LABEL}>
        Completion
        <select name="status" defaultValue={filters.status} style={FIELD}>
          <option value="">Any</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
        </select>
      </label>

      <label style={LABEL}>
        Date range applies to
        <select name="datefield" defaultValue={filters.dateField} style={FIELD}>
          {DATE_FIELDS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </label>
      <label style={LABEL}>
        From
        <input type="date" name="from" defaultValue={filters.from ?? ''} style={FIELD} />
      </label>
      <label style={LABEL}>
        To
        <input type="date" name="to" defaultValue={filters.to ?? ''} style={FIELD} />
      </label>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          type="submit"
          style={{
            ...FIELD, cursor: 'pointer', fontWeight: 700, border: 'none',
            background: accent, color: '#fff', borderRadius: '999px', padding: '9px 20px',
          }}
        >
          Apply
        </button>
        {hasFilters(filters) && (
          <Link href={`${action}?tab=${tab}`} style={{ fontSize: '13px', color: accent, textDecoration: 'underline' }}>
            Clear filters
          </Link>
        )}
      </div>
      <p style={{ flexBasis: '100%', margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Filters combine. Item, completion and date filters keep a person who has at least one matching item.
        Organization and county are typed in by each person at registration, so they match on part of the text.
        Items marked Fletcher Group Library were reached from {portalName} but are not in its own library.
      </p>
    </form>
  );
}
