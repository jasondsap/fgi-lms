import type { Metadata } from 'next';
import HelpView from '@/components/help/HelpView';

export const metadata: Metadata = {
  title: 'Help — FGI Learning Resource Center',
  description: 'How to use the Learning Resource Center: finding resources, courses and CE credits, your account, and the SCARR and Colorado certification portals.',
};

// Static content (lib/help-content.ts) rendered by a client view; nothing
// per-user on the page itself — Fletch's help mode does its own auth check.
export default function HelpPage() {
  return <HelpView />;
}
