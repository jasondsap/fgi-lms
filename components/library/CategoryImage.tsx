'use client';

interface Props { src: string; alt: string; badgeColor: string; }

export default function CategoryImage({ src, alt, badgeColor }: Props) {
  return (
    <div style={{
      borderRadius: '8px', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #e0e0e0',
      background: `${badgeColor}18`,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}
