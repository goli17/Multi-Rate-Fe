import { FormEvent, useEffect, useState } from 'react';
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

  async function load() {
    setLoading(true);
    setError('');
    try {
      setDocs(await api.listDocuments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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
            <form className="create-panel stack" onSubmit={(e) => void createDoc(e)}>
              <div>
                <h2>New draft</h2>
                <p className="muted">
                  Create a draft, then add line items. Finalize when ready.
                </p>
              </div>
              <div className="row">
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
                    className={!createForm.currency ? 'select-placeholder' : undefined}
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
            <div className="table-wrap">
              <table className="table table-cards docs-table">
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Customer</th>
                    <th>Issue date</th>
                    <th>Currency</th>
                    <th>Status</th>
                    <th className="num">Grand total</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id}>
                      <td className="cell-primary" data-label="Title">
                        <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                      </td>
                      <td data-label="Customer">{doc.customer}</td>
                      <td data-label="Issue date">{doc.issueDate}</td>
                      <td data-label="Currency">{doc.currency || 'USD'}</td>
                      <td data-label="Status">
                        <span className={`badge ${doc.status}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="num" data-label="Grand total">
                        {formatMoney(
                          doc.grandTotal,
                          doc.currency || DEFAULT_CURRENCY,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
