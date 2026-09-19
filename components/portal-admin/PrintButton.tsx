'use client';

/** "Print / Save as PDF" — the browser's print dialog is the PDF export (9-19-26). */
export default function PrintButton({ style }: { style: React.CSSProperties }) {
  return (
    <button type="button" onClick={() => window.print()} style={style}>
      Print / PDF
    </button>
  );
}
