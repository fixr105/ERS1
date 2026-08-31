'use client';

import { useEffect } from 'react';
import { validateWebhooks } from '@/lib/webhooks';

export function WebhookValidator() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const missing = validateWebhooks();
      if (missing.length > 0) {
        console.warn(
          `[Webhook Config] ${missing.length} webhook URL(s) not set in .env.local:\n` +
            missing.map((k) => `  - ${k}`).join('\n'),
        );
      }
    }
  }, []);

  return null;
}
