import { useEffect, useState } from 'react';
import { subscribeSlowRequests } from '../api';

export function ColdStartNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeSlowRequests(setOpen), []);

  if (!open) return null;

  return (
    <div className="modal-backdrop cold-start-backdrop" role="presentation">
      <div
        className="modal panel stack cold-start-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cold-start-title"
        aria-describedby="cold-start-desc"
      >
        <div className="cold-start-spinner" aria-hidden="true" />
        <div>
          <h2 id="cold-start-title">Server is waking up</h2>
          <p id="cold-start-desc" className="muted">
            This site is hosted on the free tier of Render, so it may take up to
            one to one and a half minutes to wake up. Please wait until then —
            this is because of the free tier.
          </p>
        </div>
      </div>
    </div>
  );
}
