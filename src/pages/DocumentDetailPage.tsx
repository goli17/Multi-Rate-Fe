import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { DiscountType, Document, LineInput } from '../types';

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

const emptyLine = (): LineInput & { discountMode: DiscountType } => ({
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxPercent: 0,
  discountMode: 'none',
  discountPercent: 0,
  discountFixed: 0,
});

function toPayload(line: LineInput & { discountMode: DiscountType }): LineInput {
  const payload: LineInput = {
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    taxPercent: Number(line.taxPercent ?? 0),
    discountType: line.discountMode,
  };
  if (line.discountMode === 'percent') {
    payload.discountPercent = Number(line.discountPercent ?? 0);
  }
  if (line.discountMode === 'fixed') {
    payload.discountFixed = Number(line.discountFixed ?? 0);
  }
  return payload;
}

export function DocumentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ title: '', customer: '', issueDate: '' });
  const [lineForm, setLineForm] = useState(emptyLine());
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.getDocument(id);
      setDoc(data);
      setMeta({
        title: data.title,
        customer: data.customer,
        issueDate: data.issueDate,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const readOnly = doc?.status === 'finalized';

  async function saveMeta(e: FormEvent) {
    e.preventDefault();
    if (!doc || readOnly) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateDocument(doc.id, meta);
      setDoc(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
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
      setError(err instanceof ApiError ? err.message : 'Add line failed');
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
    setBusy(true);
    setError('');
    try {
      setDoc(await api.finalizeDocument(doc.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Finalize failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeDoc() {
    if (!doc || readOnly) return;
    setBusy(true);
    try {
      await api.deleteDocument(doc.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  if (!doc) {
    return (
      <div className="panel">
        {error ? <div className="error">{error}</div> : <p className="muted">Loading…</p>}
        <Link to="/">Back</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="muted">
              <Link to="/">Documents</Link> / {doc.title}
            </p>
            <h1>{doc.title}</h1>
            <span className={`badge ${doc.status}`}>{doc.status}</span>
          </div>
          <div className="row">
            {!readOnly ? (
              <>
                <button type="button" className="secondary" onClick={() => void removeDoc()} disabled={busy}>
                  Delete
                </button>
                <button type="button" onClick={() => void finalize()} disabled={busy}>
                  Finalize
                </button>
              </>
            ) : null}
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <form className="stack" onSubmit={(e) => void saveMeta(e)}>
          <div className="row">
            <label>
              Title
              <input
                value={meta.title}
                disabled={readOnly}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                required
              />
            </label>
            <label>
              Customer
              <input
                value={meta.customer}
                disabled={readOnly}
                onChange={(e) => setMeta({ ...meta, customer: e.target.value })}
                required
              />
            </label>
            <label>
              Issue date
              <input
                type="date"
                value={meta.issueDate}
                disabled={readOnly}
                onChange={(e) => setMeta({ ...meta, issueDate: e.target.value })}
                required
              />
            </label>
          </div>
          {!readOnly ? (
            <button type="submit" className="secondary" disabled={busy}>
              Save details
            </button>
          ) : (
            <p className="muted">Finalized documents are read-only.</p>
          )}
        </form>
      </div>

      <div className="panel stack">
        <h2>Line items</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Discount</th>
              <th>Tax %</th>
              <th>Line total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((line) => (
              <tr key={line.id}>
                <td>{line.description}</td>
                <td>{line.quantity}</td>
                <td>{money(line.unitPrice)}</td>
                <td>
                  {line.discountType === 'percent'
                    ? `${line.discountPercent}%`
                    : line.discountType === 'fixed'
                      ? money(line.discountFixed ?? 0)
                      : '—'}
                </td>
                <td>{line.taxPercent}</td>
                <td>{money(line.lineTotal)}</td>
                <td>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void removeLine(line.id)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!readOnly ? (
          <form className="stack" onSubmit={(e) => void addLine(e)}>
            <h2>Add line</h2>
            <div className="row">
              <label>
                Description
                <input
                  value={lineForm.description}
                  onChange={(e) =>
                    setLineForm({ ...lineForm, description: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={lineForm.quantity}
                  onChange={(e) =>
                    setLineForm({ ...lineForm, quantity: Number(e.target.value) })
                  }
                  required
                />
              </label>
              <label>
                Unit price
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={lineForm.unitPrice}
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      unitPrice: Number(e.target.value),
                    })
                  }
                  required
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
                    min={0}
                    max={100}
                    step="0.01"
                    value={lineForm.discountPercent ?? 0}
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        discountPercent: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ) : null}
              {lineForm.discountMode === 'fixed' ? (
                <label>
                  Discount $
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={lineForm.discountFixed ?? 0}
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        discountFixed: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ) : null}
              <label>
                Tax %
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={lineForm.taxPercent ?? 0}
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      taxPercent: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <button type="submit" disabled={busy}>
              Add line
            </button>
          </form>
        ) : null}

        <div className="totals">
          <div>
            Subtotal
            <strong>{money(doc.subtotal)}</strong>
          </div>
          <div>
            Total discount
            <strong>{money(doc.totalDiscount)}</strong>
          </div>
          <div>
            Total tax
            <strong>{money(doc.totalTax)}</strong>
          </div>
          <div>
            Grand total
            <strong>{money(doc.grandTotal)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
