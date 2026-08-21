import Link from 'next/link';
import LoginModal from '@/components/auth/LoginModal';
import type { ResourceTeaser } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

/**
 * The signed-out view of any resource page (8-20-26 auth rebuild, phase 4).
 * Browsing the library is free; opening a resource requires an account —
 * so this renders only what the library card already showed (title, type,
 * description) and auto-opens the auth modal on the Create Account tab,
 * stamped with the surface so registration attribution works. Closing the
 * modal leaves the locked panel with a button to reopen it.
 *
 * The full page — and anything sensitive like presigned URLs — is never
 * rendered or generated for a signed-out request (see ResourceDetail).
 */
export default function ResourceGate(
  { resource, surface }: { resource: ResourceTeaser; surface: Surface },
) {
  const typeLabel = RESOURCE_TYPE_LABELS[resource.type as ResourceType] ?? resource.type;

  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>

        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          <Link href={surface.basePath || '/'} style={{ color: surface.primary }}>Home</Link>
          {' / '}
          <Link href={surface.libraryHref} style={{ color: surface.primary }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        <h1 style={{
          fontSize: '45px', lineHeight: 1.1, fontWeight: 700,
          fontStretch: '75%', color: 'var(--text-primary)', maxWidth: '30ch',
        }}>
          {resource.title}
        </h1>
        <div style={{ fontSize: '17px', color: 'var(--text-secondary)', marginTop: '10px' }}>
          {typeLabel}
        </div>

        {resource.description && (
          <p style={{
            fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)',
            maxWidth: '62ch', marginTop: '1.25rem',
          }}>
            {resource.description}
          </p>
        )}

        {/* The lock panel — modal opens on arrival; this stays for reopening. */}
        <div style={{
          background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
          padding: '2rem 2.25rem', marginTop: '2rem', maxWidth: '620px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '21px', fontWeight: 700, color: 'var(--text-primary)' }}>
            This resource is free — it just needs an account.
          </div>
          <p style={{
            fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)',
            margin: '10px 0 1.25rem',
          }}>
            Create a free Learning Resource Center account to view courses, videos,
            documents, and more. Already have one? Log in and you&rsquo;ll land right
            back here.
          </p>
          <LoginModal
            surface={surface.key}
            initialView="register"
            autoOpen
            trigger="cta"
            accent={surface.primary}
          />
        </div>

        <Link href={surface.libraryHref} style={{
          display: 'inline-block', marginTop: '1.5rem',
          color: surface.primary, fontWeight: 600, fontSize: '15px',
        }}>
          ← Back to Library
        </Link>
      </div>
    </div>
  );
}
