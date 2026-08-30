import Image from 'next/image';
import PresenterBio from '@/components/resource/PresenterBio';
import type { Presenter } from '@/types';

/**
 * Headshot + bio band, shared by the webinar layout (4-21-26 mockup) and the
 * PDF shell (8-11-26), which places the same card under the document.
 */
export default function PresenterCard(
  { presenter: p, accent }: { presenter: Presenter; accent: string },
) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px',
      padding: '1.5rem', display: 'grid',
      gridTemplateColumns: p.org_logo_url ? '140px 1fr 180px' : '140px 1fr',
      gap: '1.75rem', alignItems: 'start',
    }}>
      <div>
        {p.photo_url ? (
          <Image
            src={p.photo_url} alt={p.name} width={140} height={140}
            style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '4px' }}
          />
        ) : (
          <div style={{
            width: '140px', height: '140px', borderRadius: '4px',
            background: 'var(--body-bg)', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: 'var(--text-muted)',
          }}>
            {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-body-dark)' }}>
          {p.name}{p.credentials ? `, ${p.credentials}` : ''}
        </div>
        {p.title && (
          <div style={{ fontSize: '14px', fontWeight: 600, color: accent, margin: '2px 0 10px' }}>
            {p.title}
          </div>
        )}
        {p.bio && <PresenterBio bio={p.bio} accent={accent} />}
      </div>

      {p.org_logo_url && (
        <div style={{ textAlign: 'center' }}>
          {/* Every org logo sits in the same 180×80 frame regardless of shape
              (Jennifer, 8-29: "a standardish size for logos"). */}
          <div style={{ width: '180px', height: '80px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              src={p.org_logo_url} alt={p.org_name ?? ''} width={180} height={80}
              style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
            />
          </div>
          {p.org_url && (
            <a
              href={p.org_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: accent }}
            >
              {p.org_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
          {/* Second affiliation (8-29-26): e.g. Jac Charlier is TASC's
              executive director AND CEO of PTACC — Jennifer wants both. */}
          {p.org2_url && (
            <a
              href={p.org2_url} target="_blank" rel="noopener noreferrer"
              title={p.org2_name ?? undefined}
              style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: accent }}
            >
              {p.org2_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
