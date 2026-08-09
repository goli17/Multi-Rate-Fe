import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { ReportTotalsSkeleton } from '../components/Skeleton';
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../lib/money';
import type { SummaryReport } from '../types';

export function ReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function runReport(
    nextFrom = from,
    nextTo = to,
    nextCurrency = currency,
  ) {
    setLoading(true);
    setError('');
    try {
      setReport(await api.summary(nextFrom, nextTo, nextCurrency));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Report failed');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.summary(monthStart, today, DEFAULT_CURRENCY);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Report failed');
          setReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monthStart, today]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await runReport();
  }

  const reportCurrency = report?.currency || currency;

  return (
    <div className="panel stack">
      <div>
        <h1>Summary report</h1>
        <p className="muted">
          Totals for documents by issue date range and currency.
        </p>
      </div>
      <form className="row report-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
            required
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Run report'}
        </button>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {loading ? (
        <ReportTotalsSkeleton />
      ) : report ? (
        <>
          <div className="totals">
            <div>
              Documents
              <strong>{report.documentCount}</strong>
            </div>
            <div>
              Sum of grand totals
              <strong>
                {formatMoney(report.sumGrandTotals, reportCurrency)}
              </strong>
            </div>
            <div>
              Sum of tax
              <strong>
                {formatMoney(report.sumTotalTax, reportCurrency)}
              </strong>
            </div>
            <div>
              Sum of discounts
              <strong>
                {formatMoney(report.sumTotalDiscount, reportCurrency)}
              </strong>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
