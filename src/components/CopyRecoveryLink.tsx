'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyRecoveryLinkProps {
  href: string;
  label?: string;
}

/**
 * Reusable 'Copy your recovery link' button.
 * Low-prominence outlined style (not filled orange).
 * Uses Copy/Check 2-second toggle feedback pattern.
 */
export default function CopyRecoveryLink({ href, label = 'Copy your recovery link' }: CopyRecoveryLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard in insecure contexts
      const el = document.createElement('textarea');
      el.value = href;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
      data-testid="copy-recovery-link-btn"
      aria-label={label}
    >
      {copied ? (
        <>
          <Check size={16} className="text-green-600" />
          <span className="text-green-700">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={16} />
          {label}
        </>
      )}
    </button>
  );
}
