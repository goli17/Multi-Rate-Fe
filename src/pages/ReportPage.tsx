import { FormEvent, useState } from 'react';
import { api, ApiError } from '../api';
import type { SummaryReport } from '../types';

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

export function ReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      setReport(await api.summary(from, to));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Report failed');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel stack">
      <div>
        <h1>Summary report</h1>
        <p className="muted">Totals for documents by issue date range.</p>
      </div>
      <form className="row" onSubmit={(e) => void onSubmit(e)}>
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Run report'}
        </button>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {report ? (
        <div className="totals">
          <div>
            Documents
            <strong>{report.documentCount}</strong>
          </div>
          <div>
            Sum of grand totals
            <strong>{money(report.sumGrandTotals)}</strong>
          </div>
          <div>
            Sum of tax
            <strong>{money(report.sumTotalTax)}</strong>
          </div>
          <div>
            Sum of discounts
            <strong>{money(report.sumTotalDiscount)}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}
