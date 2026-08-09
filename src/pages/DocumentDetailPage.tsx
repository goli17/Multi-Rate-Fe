import { FormEvent, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LeaveDraftDialog } from '../components/LeaveDraftDialog';
import { DocumentDetailSkeleton } from '../components/Skeleton';
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../lib/money';
import type { DiscountType, Document } from '../types';

const PLACEHOLDER_TITLES = new Set(['', 'Untitled document', 'Untitled']);
const PLACEHOLDER_CUSTOMERS = new Set(['', 'New customer']);

function displayOrEmpty(value: string, placeholders: Set<string>) {
  const trimmed = value.trim();
  return placeholders.has(trimmed) ? '' : value;
}

type LineFormState = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxPercent: string;
  discountMode: DiscountType;
  discountPercent: string;
  discountFixed: string;
};

const emptyLine = (): LineFormState => ({
  description: '',
  quantity: '',
  unitPrice: '',
  taxPercent: '',
  discountMode: 'none',
  discountPercent: '',
  discountFixed: '',
});

function parseRequiredPositive(
  raw: string,
  label: string,
  integer = false,
): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
  if (integer && (!Number.isInteger(value) || value < 1)) {
    throw new Error(`${label} must be an integer >= 1`);
  }
  return value;
}

function toPayload(line: LineFormState) {
  const description = line.description.trim();
  if (!description) {
    throw new Error('Description is required');
  }

  const payload: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
    discountType: DiscountType;
    discountPercent?: number;
    discountFixed?: number;
  } = {
    description,
    quantity: parseRequiredPositive(line.quantity, 'Quantity', true),
    unitPrice: parseRequiredPositive(line.unitPrice, 'Unit price'),
    taxPercent: 0,
    discountType: line.discountMode,
  };

  if (line.taxPercent.trim()) {
    const tax = Number(line.taxPercent);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      throw new Error('Tax percent must be between 0 and 100');
    }
    payload.taxPercent = tax;
  }

  if (line.discountMode === 'percent') {
    payload.discountPercent = parseRequiredPositive(
      line.discountPercent,
      'Discount percent',
    );
    if (payload.discountPercent > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }
  }
  if (line.discountMode === 'fixed') {
    payload.discountFixed = parseRequiredPositive(
      line.discountFixed,
      'Fixed discount',
    );
  }

  return payload;
}

function discountLabel(line: Document['lineItems'][number], currency: string) {
  if (line.discountType === 'percent') {
    return `${line.discountPercent}% (−${formatMoney(line.discountAmount, currency)})`;
  }
  if (line.discountType === 'fixed') {
    return formatMoney(line.discountFixed ?? 0, currency);
  }
  return '—';
}

export function DocumentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({
    title: '',
    customer: '',
    issueDate: '',
    currency: DEFAULT_CURRENCY,
  });
  const [lineForm, setLineForm] = useState(emptyLine());
  const [busy, setBusy] = useState(false);
  const allowLeaveRef = useRef(false);

  const needsLeaveDecision =
    !!doc && doc.status === 'draft' && doc.lineItems.length === 0;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowLeaveRef.current) return false;
    if (!needsLeaveDecision) return false;
    return currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!needsLeaveDecision || allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [needsLeaveDecision]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDocument(id);
      setDoc(data);
      setMeta({
        title: displayOrEmpty(data.title, PLACEHOLDER_TITLES),
        customer: displayOrEmpty(data.customer, PLACEHOLDER_CUSTOMERS),
        issueDate: data.issueDate || '',
        currency: data.currency || '',
      });
    } catch (err) {
      setDoc(null);
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const readOnly = doc?.status === 'finalized';
  const currency = meta.currency || doc?.currency || DEFAULT_CURRENCY;
  const displayTitle = (() => {
    if (meta.title.trim()) return meta.title.trim();
    if (!doc) return 'Draft document';
    return PLACEHOLDER_TITLES.has(doc.title.trim())
      ? 'Draft document'
      : doc.title;
  })();

  async function persistMeta(next: typeof meta) {
    if (!doc || readOnly) return null;
    if (!next.title.trim() || !next.customer.trim()) {
      throw new Error('Title and customer are required');
    }
    if (!next.issueDate) {
      throw new Error('Issue date is required');
    }
    if (!next.currency) {
      throw new Error('Currency is required');
    }
    const updated = await api.updateDocument(doc.id, {
      title: next.title.trim(),
      customer: next.customer.trim(),
      issueDate: next.issueDate,
      currency: next.currency,
    });
    setDoc(updated);
    setMeta({
      title: updated.title,
      customer: updated.customer,
      issueDate: updated.issueDate,
      currency: updated.currency || DEFAULT_CURRENCY,
    });
    return updated;
  }

  async function saveMeta(e: FormEvent) {
    e.preventDefault();
    if (!doc || readOnly) return;
    setBusy(true);
    setError('');
    try {
      await persistMeta(meta);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Save failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onCurrencyChange(nextCurrency: string) {
    if (!doc || readOnly) return;
    const next = { ...meta, currency: nextCurrency };
    setMeta(next);
    // Persist currency immediately so amounts match the selection
    if (!next.title.trim() || !next.customer.trim() || !next.issueDate) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await persistMeta(next);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not update currency',
      );
    } finally {
      setBusy(false);
    }
  }

  async function addLine(e: FormEvent) {
    e.preventDefault();
    if (!doc || readOnly) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.addLine(doc.id, toPayload(lineForm));
      setDoc(updated);
      setLineForm(emptyLine());
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Add line failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeLine(lineId: string) {
    if (!doc || readOnly) return;
    setBusy(true);
    setError('');
    try {
      setDoc(await api.removeLine(doc.id, lineId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!doc || readOnly) return;
    if (!doc.lineItems.length) {
      setError('Add at least one line item before finalizing.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      allowLeaveRef.current = true;
      setDoc(await api.finalizeDocument(doc.id));
    } catch (err) {
      allowLeaveRef.current = false;
      setError(err instanceof ApiError ? err.message : 'Finalize failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeDoc() {
    if (!doc || readOnly) return;
    setBusy(true);
    try {
      allowLeaveRef.current = true;
      await api.deleteDocument(doc.id);
      if (blocker.state === 'blocked') {
        blocker.proceed();
      } else {
        navigate('/');
      }
    } catch (err) {
      allowLeaveRef.current = false;
      setError(err instanceof ApiError ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  function keepAsDraft() {
    allowLeaveRef.current = true;
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate('/');
    }
  }

  function stayOnDocument() {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }

  if (loading) {
    return <DocumentDetailSkeleton />;
  }

  if (!doc) {
    return (
      <div className="panel stack">
        {error ? <div className="error">{error}</div> : null}
        <p className="muted">Document not found.</p>
        <Link to="/">Back to documents</Link>
      </div>
    );
  }

  return (
    <div className={`stack ${busy ? 'panel-busy' : ''}`.trim()}>
      <LeaveDraftDialog
        open={blocker.state === 'blocked'}
        busy={busy}
        onKeepDraft={keepAsDraft}
        onDelete={() => void removeDoc()}
        onStay={stayOnDocument}
      />

      {!readOnly ? (
        <div className="draft-banner">
          <strong>Draft</strong>
          <span>
            {doc.lineItems.length
              ? 'Edit freely, then finalize when amounts are ready. Finalized documents become read-only.'
              : 'Add at least one line item, or delete this document. You can also keep it as a draft when leaving.'}
          </span>
        </div>
      ) : (
        <div className="draft-banner finalized-banner">
          <strong>Finalized</strong>
          <span>This document is read-only. Amounts cannot be changed.</span>
        </div>
      )}

      <div className="panel stack">
        <div className="page-header">
          <div>
            <p className="muted">
              <Link
                to="/"
                onClick={(e) => {
                  if (needsLeaveDecision && !allowLeaveRef.current) {
                    e.preventDefault();
                    navigate('/');
                  }
                }}
              >
                Documents
              </Link>{' '}
              / {displayTitle}
            </p>
            <h1>{displayTitle}</h1>
            <span className={`badge ${doc.status}`}>{doc.status}</span>
          </div>
          {!readOnly ? (
            <div className="page-actions">
              <button
                type="button"
                className="secondary"
                onClick={keepAsDraft}
                disabled={busy}
              >
                Keep as draft
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void removeDoc()}
                disabled={busy}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => void finalize()}
                disabled={busy || !doc.lineItems.length}
              >
                Finalize
              </button>
            </div>
          ) : null}
        </div>
        {error ? <div className="error">{error}</div> : null}
        <form className="stack" onSubmit={(e) => void saveMeta(e)}>
          <div className="row">
            <label>
              Title
              <input
                value={meta.title}
                placeholder="e.g. Q3 pricing proposal"
                disabled={readOnly || busy}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                required
              />
            </label>
            <label>
              Customer
              <input
                value={meta.customer}
                placeholder="e.g. Acme Corp"
                disabled={readOnly || busy}
                onChange={(e) =>
                  setMeta({ ...meta, customer: e.target.value })
                }
                required
              />
            </label>
            <label>
              Issue date
              <input
                type="date"
                value={meta.issueDate}
                placeholder="YYYY-MM-DD"
                disabled={readOnly || busy}
                onChange={(e) =>
                  setMeta({ ...meta, issueDate: e.target.value })
                }
                required
                className={!meta.issueDate ? 'input-empty' : undefined}
              />
            </label>
            <label>
              Currency
              <select
                value={meta.currency}
                disabled={readOnly || busy}
                onChange={(e) => void onCurrencyChange(e.target.value)}
                required
                className={!meta.currency ? 'select-placeholder' : undefined}
              >
                <option value="" disabled>
                  Select currency
                </option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!readOnly ? (
            <div className="form-actions">
              <button type="submit" className="secondary" disabled={busy}>
                Save details
              </button>
            </div>
          ) : (
            <p className="muted">Finalized documents are read-only.</p>
          )}
        </form>
      </div>

      <div className="panel stack">
        <div className="section-header">
          <h2>Line items</h2>
        </div>
        <div className="table-wrap">
          <table className="table table-cards lines-table">
            <colgroup>
              <col className="col-desc" />
              <col className="col-qty" />
              <col className="col-money" />
              <col className="col-discount" />
              <col className="col-money" />
              <col className="col-tax" />
              <col className="col-money" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="num">
                  Qty
                </th>
                <th scope="col" className="num">
                  Unit
                </th>
                <th scope="col" className="num">
                  Discount
                </th>
                <th scope="col" className="num">
                  Subtotal
                </th>
                <th scope="col" className="num">
                  Tax
                </th>
                <th scope="col" className="num">
                  Line total
                </th>
                <th scope="col" className="cell-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {doc.lineItems.length ? (
                doc.lineItems.map((line) => (
                  <tr key={line.id}>
                    <td className="cell-primary" data-label="Description">
                      {line.description}
                    </td>
                    <td className="num" data-label="Qty">
                      {line.quantity}
                    </td>
                    <td className="num" data-label="Unit">
                      {formatMoney(line.unitPrice, currency)}
                    </td>
                    <td className="num" data-label="Discount">
                      {discountLabel(line, currency)}
                    </td>
                    <td className="num" data-label="Subtotal">
                      {formatMoney(line.subtotal, currency)}
                    </td>
                    <td className="num" data-label="Tax">
                      {formatMoney(line.taxAmount, currency)}
                      <span className="muted"> ({line.taxPercent}%)</span>
                    </td>
                    <td className="num" data-label="Line total">
                      {formatMoney(line.lineTotal, currency)}
                    </td>
                    <td className="cell-actions" data-label="">
                      {!readOnly ? (
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => void removeLine(line.id)}
                          disabled={busy}
                          aria-label={`Remove ${line.description}`}
                          title="Remove line"
                        >
                          <Trash2 size={16} strokeWidth={2} aria-hidden />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="cell-empty muted">
                    No line items yet. Add one below — quantity and unit price
                    must be greater than zero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!readOnly ? (
          <form className="stack" onSubmit={(e) => void addLine(e)}>
            <h2>Add line</h2>
            <div className="row">
              <label>
                Description
                <input
                  value={lineForm.description}
                  placeholder="e.g. Widget A"
                  onChange={(e) =>
                    setLineForm({ ...lineForm, description: e.target.value })
                  }
                  required
                  disabled={busy}
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={lineForm.quantity}
                  placeholder="e.g. 2"
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      quantity: e.target.value,
                    })
                  }
                  required
                  disabled={busy}
                />
              </label>
              <label>
                Unit price
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={lineForm.unitPrice}
                  placeholder="e.g. 100.00"
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      unitPrice: e.target.value,
                    })
                  }
                  required
                  disabled={busy}
                />
              </label>
            </div>
            <div className="row">
              <label>
                Discount type
                <select
                  value={lineForm.discountMode}
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      discountMode: e.target.value as DiscountType,
                    })
                  }
                  disabled={busy}
                >
                  <option value="none">None</option>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              {lineForm.discountMode === 'percent' ? (
                <label>
                  Discount %
                  <input
                    type="number"
                    min={0.01}
                    max={100}
                    step="0.01"
                    value={lineForm.discountPercent}
                    placeholder="e.g. 10"
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        discountPercent: e.target.value,
                      })
                    }
                    required
                    disabled={busy}
                  />
                </label>
              ) : null}
              {lineForm.discountMode === 'fixed' ? (
                <label>
                  Discount amount
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={lineForm.discountFixed}
                    placeholder="e.g. 20.00"
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        discountFixed: e.target.value,
                      })
                    }
                    required
                    disabled={busy}
                  />
                </label>
              ) : null}
              <label>
                Tax % (optional)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={lineForm.taxPercent}
                  placeholder="e.g. 5"
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      taxPercent: e.target.value,
                    })
                  }
                  disabled={busy}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Add line'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="totals">
          <div>
            Subtotal
            <strong>{formatMoney(doc.subtotal, currency)}</strong>
          </div>
          <div>
            Total discount
            <strong>{formatMoney(doc.totalDiscount, currency)}</strong>
          </div>
          <div>
            Total tax
            <strong>{formatMoney(doc.totalTax, currency)}</strong>
          </div>
          <div>
            Grand total
            <strong>{formatMoney(doc.grandTotal, currency)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
