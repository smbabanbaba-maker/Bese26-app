import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';

const badgeCopy = {
  id: { label: 'ID Verified', title: 'Identity Verified', description: "Bese26 has verified this seller's identity." },
  cac: { label: 'CAC Verified', title: 'Business Verified', description: "This seller's business registration has been verified by Bese26." },
};

export default function VerificationBadges({ idVerified = false, cacVerified = false, compact = false }) {
  const [open, setOpen] = useState(null);
  const items = [idVerified && 'id', cacVerified && 'cac'].filter(Boolean);
  if (!items.length) return null;
  return <div className={`verification-badge-group${compact ? ' compact' : ''}`} aria-label="Verification badges">
    {items.map((kind) => {
      const copy = badgeCopy[kind];
      const active = open === kind;
      return <span className="verification-badge-wrap" key={kind}>
        <button type="button" className={`verification-badge verification-badge-${kind}${active ? ' is-open' : ''}`} aria-expanded={active} aria-label={`${copy.label}. Tap for details.`} onClick={() => setOpen(active ? null : kind)}>
          <BadgeCheck size={compact ? 12 : 14} aria-hidden="true" /> {copy.label}
        </button>
        {active && <span className="verification-badge-popover" role="tooltip"><strong>{copy.title}</strong><small>{copy.description}</small></span>}
      </span>;
    })}
  </div>;
}

export { badgeCopy };
