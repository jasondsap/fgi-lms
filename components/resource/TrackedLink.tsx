'use client';

import type { AnchorHTMLAttributes } from 'react';
import { logResourceEventAction } from './activity-actions';
import type { ResourceEvent } from '@/lib/progress';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  resourceId: string;
  event: ResourceEvent;
  surfaceKey: string;
}

/**
 * A plain link that records an activity event as it is followed. Download
 * buttons point straight at presigned S3 URLs, so the click is the only
 * place we can see them (9-17-26). Fire-and-forget: the browser follows the
 * href immediately and a logging failure never blocks the download.
 */
export default function TrackedLink({ resourceId, event, surfaceKey, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        void logResourceEventAction(resourceId, event, surfaceKey);
        onClick?.(e);
      }}
    />
  );
}
