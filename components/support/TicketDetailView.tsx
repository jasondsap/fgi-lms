'use client';

/**
 * Ticket detail — description, comment thread, reply box; admins additionally
 * get internal notes and the status/priority/resolution controls. One
 * component for both chromes and both roles: the server page decides
 * `isAdmin` and `listPath` ('/support' or '/<tenant>/support').
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORY_LABEL, STATUS_LABEL, PRIORITY_LABEL, TICKET_PRIORITIES, TICKET_STATUSES,
  type SupportTicket, type SupportTicketComment, type TicketAssignee,
} from '@/lib/support';
import { addCommentAction, deleteTicketAction, updateTicketAction } from './support-actions';
import { TicketPill, ticketDate } from './TicketListView';

const CARD: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
};

const FIELD: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '14px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
  background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box',
};

export default function TicketDetailView({
  ticket, comments, isAdmin, listPath, assignees = [], accent = 'var(--fgi-blue)',
}: {
  ticket: SupportTicket;
  comments: SupportTicketComment[];
  isAdmin: boolean;
  listPath: string;
  /** Admin users for the assignee dropdown; only passed for admin viewers. */
  assignees?: TicketAssignee[];
  accent?: string;
}) {
  const router = useRouter();

  // Reply box
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Admin controls
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignee, setAssignee] = useState(ticket.assigned_to ?? '');
  const [note, setNote] = useState(ticket.resolution_note ?? '');
  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Delete flow: click once to arm, again to confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sendComment = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setError('');
    const result = await addCommentAction(listPath, ticket.id, body.trim(), internal);
    setSending(false);
    if ('error' in result) { setError(result.error); return; }
    setBody('');
    setInternal(false);
    router.refresh();
  };

  const saveAdmin = async () => {
    if (saving) return;
    setSaving(true);
    setAdminError('');
    const result = await updateTicketAction(listPath, ticket.id, {
      status, priority, assignedTo: assignee || null, resolutionNote: note,
    });
    setSaving(false);
    if ('error' in result) { setAdminError(result.error); return; }
    router.refresh();
  };

  const doDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setAdminError('');
    const result = await deleteTicketAction(ticket.id);
    if ('error' in result) {
      setDeleting(false);
      setConfirmDelete(false);
      setAdminError(result.error);
      return;
    }
    router.push('/admin/support');
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header card */}
      <div style={{ ...CARD, padding: '18px 20px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          <TicketPill kind="status" value={ticket.status} />
          <TicketPill kind="priority" value={ticket.priority} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            {CATEGORY_LABEL[ticket.category] ?? ticket.category}
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>
          {ticket.title}
        </h1>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          {isAdmin && (ticket.submitted_by_name || ticket.submitted_by_email) && (
            <>From {ticket.submitted_by_name || ticket.submitted_by_email}
              {ticket.submitted_by_email && ticket.submitted_by_name ? ` (${ticket.submitted_by_email})` : ''} · </>
          )}
          Opened {ticketDate(ticket.created_at)} · Updated {ticketDate(ticket.updated_at)}
          {isAdmin && ticket.assigned_to_name && <> · Assigned to {ticket.assigned_to_name}</>}
        </div>
        <p style={{
          fontSize: '14.5px', lineHeight: 1.65, color: 'var(--text-primary)',
          margin: '14px 0 0', whiteSpace: 'pre-wrap',
        }}>
          {ticket.description}
        </p>
        {isAdmin && (ticket.page_url || ticket.browser_info) && (
          <div style={{
            marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)',
            fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, wordBreak: 'break-all',
          }}>
            {ticket.page_url && <div>Page: {ticket.page_url}</div>}
            {ticket.browser_info && <div>Browser: {ticket.browser_info}</div>}
          </div>
        )}
      </div>

      {/* Resolution note (visible to everyone once set) */}
      {ticket.resolution_note && (
        <div style={{
          ...CARD, padding: '14px 18px', borderLeft: '4px solid #1e7a3a', background: '#f4faf6',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e7a3a', marginBottom: '4px' }}>
            Resolution
          </div>
          <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {ticket.resolution_note}
          </p>
        </div>
      )}

      {/* Comment thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              ...CARD, padding: '12px 16px',
              ...(c.is_internal ? { background: '#fdf8ec', borderColor: '#ecd9a8' } : {}),
            }}
          >
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>
                {c.author_is_admin ? 'Learning Center Support' : (c.author_name || 'You')}
              </strong>
              {' · '}{ticketDate(c.created_at)}
              {c.is_internal && (
                <span style={{
                  marginLeft: '8px', background: '#f2b134', color: '#163d5b',
                  fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '3px',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>Internal note</span>
              )}
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {c.body}
            </p>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div style={{ ...CARD, padding: '14px 16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
          Add a comment
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Reply to this ticket…"
          style={{ ...FIELD, resize: 'vertical' }}
        />
        {error && (
          <div role="alert" style={{ fontSize: '13px', color: '#8a1c1c', marginTop: '8px' }}>{error}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
          {isAdmin ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
                style={{ accentColor: 'var(--fgi-blue)' }}
              />
              Internal note (hidden from the submitter)
            </label>
          ) : <span />}
          <button
            onClick={sendComment}
            disabled={sending || !body.trim()}
            style={{
              background: accent, color: '#fff', padding: '8px 18px', border: 'none',
              borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
              fontFamily: 'inherit',
              cursor: sending || !body.trim() ? 'default' : 'pointer',
              opacity: sending || !body.trim() ? 0.55 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div style={{ ...CARD, padding: '16px', borderLeft: '4px solid var(--fgi-navy)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fgi-navy)', marginBottom: '12px' }}>
            Admin — triage
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={FIELD}>
                {TICKET_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={FIELD}>
                {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Assigned to</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={FIELD}>
                <option value="">Unassigned</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Resolution note (shown to the submitter)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{ ...FIELD, resize: 'vertical' }}
          />
          {adminError && (
            <div role="alert" style={{ fontSize: '13px', color: '#8a1c1c', marginTop: '8px' }}>{adminError}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {confirmDelete ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#8a1c1c' }}>
                Delete this ticket?
                <button
                  onClick={doDelete}
                  disabled={deleting}
                  style={{
                    background: '#b3261e', color: '#fff', padding: '7px 14px', border: 'none',
                    borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'inherit', cursor: deleting ? 'default' : 'pointer',
                    opacity: deleting ? 0.55 : 1,
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{
                    background: 'none', border: 'none', fontSize: '13px', fontFamily: 'inherit',
                    color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', padding: 0,
                  }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'none', border: 'none', fontSize: '13px', fontFamily: 'inherit',
                  color: '#b3261e', textDecoration: 'underline', cursor: 'pointer', padding: 0,
                }}
              >
                Delete ticket
              </button>
            )}
            <button
              onClick={saveAdmin}
              disabled={saving}
              style={{
                background: 'var(--fgi-navy)', color: '#fff', padding: '8px 20px', border: 'none',
                borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
                fontFamily: 'inherit', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.55 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
