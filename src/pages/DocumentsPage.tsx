import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { DocumentSummary } from '../types';

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

export function DocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setDocs(await api.listDocuments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createDoc() {
    setCreating(true);
    setError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const doc = await api.createDocument({
        title: 'Untitled document',
        customer: 'New customer',
        issueDate: today,
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
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Documents</h1>
          <p className="muted">Draft, finalize, and review pricing documents.</p>
        </div>
        <button type="button" onClick={() => void createDoc()} disabled={creating}>
          {creating ? 'Creating…' : 'New document'}
        </button>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Customer</th>
            <th>Issue date</th>
            <th>Status</th>
            <th>Grand total</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id}>
              <td>
                <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
              </td>
              <td>{doc.customer}</td>
              <td>{doc.issueDate}</td>
              <td>
                <span className={`badge ${doc.status}`}>{doc.status}</span>
              </td>
              <td>{money(doc.grandTotal)}</td>
            </tr>
          ))}
          {!docs.length ? (
            <tr>
              <td colSpan={5} className="muted">
                No documents yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
