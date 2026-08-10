import { FormEvent, useEffect, useState } from 'react';
import { Eye, SquarePen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { DocumentsListSkeleton } from '../components/Skeleton';
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../lib/money';
import type { DocumentSummary } from '../types';

type CreateForm = {
  title: string;
  customer: string;
  issueDate: string;
  currency: string;
};

function emptyCreateForm(): CreateForm {
  return {
    title: '',
    customer: '',
    issueDate: '',
    currency: '',
  };
}

export function DocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.listDocuments();
        if (!cancelled) setDocs(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createDoc(e: FormEvent) {
    e.preventDefault();
    const title = createForm.title.trim();
    const customer = createForm.customer.trim();
    if (!title || !customer) {
      setError('Title and customer are required');
      return;
    }
    if (!createForm.issueDate) {
      setError('Issue date is required');
      return;
    }
    if (!createForm.currency) {
      setError('Currency is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const doc = await api.createDocument({
        title,
        customer,
        issueDate: createForm.issueDate,
        currency: createForm.currency,
        lineItems: [],
      });
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
      setCreating(false);
    }
  }

  return (
    <div className="panel stack">
      {loading ? (
        <DocumentsListSkeleton />
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1>Documents</h1>
              <p className="muted">
                Draft, finalize, and review pricing documents.
              </p>
            </div>
            <div className="page-actions">
              <button
                type="button"
                onClick={() => {
                  setCreateForm(emptyCreateForm());
                  setShowCreate(true);
                  setError('');
                }}
                disabled={creating}
              >
                New document
              </button>
            </div>
          </div>
          {error ? <div className="error">{error}</div> : null}

          {showCreate ? (
            <form
              className="create-panel stack"
              onSubmit={(e) => void createDoc(e)}
            >
              <div>
                <h2>New draft</h2>
                <p className="muted">
                  Create a draft, then add line items. Finalize when ready.
                </p>
              </div>
              <div className="form-grid">
                <label>
                  Title
                  <input
                    value={createForm.title}
                    placeholder="e.g. Q3 pricing proposal"
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                    required
                    disabled={creating}
                  />
                </label>
                <label>
                  Customer
                  <input
                    value={createForm.customer}
                    placeholder="e.g. Acme Corp"
                    onChange={(e) =>
                      setCreateForm({ ...createForm, customer: e.target.value })
                    }
                    required
                    disabled={creating}
                  />
                </label>
                <label>
                  Issue date
                  <input
                    type="date"
                    value={createForm.issueDate}
                    placeholder="YYYY-MM-DD"
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        issueDate: e.target.value,
                      })
                    }
                    required
                    disabled={creating}
                    className={!createForm.issueDate ? 'input-empty' : undefined}
                  />
                </label>
                <label>
                  Currency
                  <select
                    value={createForm.currency}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        currency: e.target.value,
                      })
                    }
                    required
                    disabled={creating}
                    className={
                      !createForm.currency ? 'select-placeholder' : undefined
                    }
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
              <div className="page-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create draft'}
                </button>
              </div>
            </form>
          ) : null}

          {!docs.length && !showCreate ? (
            <div className="empty-state">
              <h2>No documents yet</h2>
              <p className="muted">
                Create a draft to add line items, discounts, and tax.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateForm(emptyCreateForm());
                  setShowCreate(true);
                }}
                disabled={creating}
              >
                Create your first document
              </button>
            </div>
          ) : null}

          {docs.length ? (
            <ul className="docs-list">
              {docs.map((doc) => {
                const isDraft = doc.status === 'draft';
                const actionLabel = isDraft
                  ? `Edit ${doc.title}`
                  : `View ${doc.title}`;
                return (
                  <li key={doc.id} className="docs-card">
                    <div className="docs-card-main">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="docs-card-title"
                      >
                        {doc.title}
                      </Link>
                      <dl className="docs-card-meta">
                        <div>
                          <dt>Customer</dt>
                          <dd>{doc.customer}</dd>
                        </div>
                        <div>
                          <dt>Issue date</dt>
                          <dd>{doc.issueDate}</dd>
                        </div>
                        <div>
                          <dt>Currency</dt>
                          <dd>{doc.currency || 'USD'}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>
                            <span className={`badge ${doc.status}`}>
                              {doc.status}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>Grand total</dt>
                          <dd className="docs-card-total">
                            {formatMoney(
                              doc.grandTotal,
                              doc.currency || DEFAULT_CURRENCY,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="icon-btn docs-card-action"
                      aria-label={actionLabel}
                      title={isDraft ? 'Edit draft' : 'View document'}
                    >
                      {isDraft ? (
                        <SquarePen size={16} strokeWidth={2} aria-hidden />
                      ) : (
                        <Eye size={16} strokeWidth={2} aria-hidden />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
