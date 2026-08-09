type LeaveDraftDialogProps = {
  open: boolean;
  busy?: boolean;
  onKeepDraft: () => void;
  onDelete: () => void;
  onStay: () => void;
};

export function LeaveDraftDialog({
  open,
  busy = false,
  onKeepDraft,
  onDelete,
  onStay,
}: LeaveDraftDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal panel stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-draft-title"
      >
        <div>
          <h2 id="leave-draft-title">Leave this draft?</h2>
          <p className="muted">
            This draft has no line items yet. Add a line, delete it, or keep it
            as a draft to finish later.
          </p>
        </div>
        <div className="page-actions modal-actions">
          <button type="button" className="secondary" onClick={onStay} disabled={busy}>
            Stay and add a line
          </button>
          <button type="button" onClick={onKeepDraft} disabled={busy}>
            Keep as draft
          </button>
          <button type="button" className="danger" onClick={onDelete} disabled={busy}>
            Delete document
          </button>
        </div>
      </div>
    </div>
  );
}
