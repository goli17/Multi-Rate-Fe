import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import { ReportTotalsSkeleton } from '../components/Skeleton';
import { CURRENCIES, formatMoney } from '../lib/money';
import type { SummaryReport } from '../types';

function formatReportDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function monthBounds(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(from), to: iso(to) };
}

export function ReportPage() {
  const defaults = useMemo(() => monthBounds(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function runReport(
    nextFrom = from,
    nextTo = to,
    nextCurrencies = selectedCurrencies,
  ) {
    setLoading(true);
    setError('');
    try {
      setReport(await api.summary(nextFrom, nextTo, nextCurrencies));
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
        const data = await api.summary(defaults.from, defaults.to, []);
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
  }, [defaults.from, defaults.to]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await runReport();
  }

  const reportFilterLabel =
    report && report.currencies.length
      ? report.currencies.join(', ')
      : 'All currencies';
  const rows = report?.documents ?? [];
  const currencyOptions = useMemo(
    () => CURRENCIES.map((c) => ({ value: c.code, label: c.label })),
    [],
  );

  return (
    <div className="panel stack">
      <div>
        <h1>Summary report</h1>
        <p className="muted">
          Finalized documents in the selected month/date range. Currency filter
          is optional — leave empty to include all currencies.
        </p>
      </div>
      <form className="report-form" onSubmit={(e) => void onSubmit(e)}>
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
        <MultiSelectDropdown
          label="Currencies (optional)"
          options={currencyOptions}
          value={selectedCurrencies}
          onChange={setSelectedCurrencies}
          disabled={loading}
          emptyLabel="All currencies"
          placeholder="All currencies"
        />
        <div className="report-form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Run report'}
          </button>
        </div>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {loading ? (
        <ReportTotalsSkeleton />
      ) : report ? (
        <div className="report-sheet stack">
          <header className="report-sheet-header">
            <div>
              <p className="report-eyebrow">Finalized pricing summary</p>
              <h2>Document report</h2>
            </div>
            <dl className="report-meta">
              <div>
                <dt>Period</dt>
                <dd>
                  {formatReportDate(report.from)} –{' '}
                  {formatReportDate(report.to)}
                </dd>
              </div>
              <div>
                <dt>Currency filter</dt>
                <dd>{reportFilterLabel}</dd>
              </div>
              <div>
                <dt>Documents</dt>
                <dd>{report.documentCount}</dd>
              </div>
            </dl>
          </header>

          <div className="table-wrap">
            <table className="table table-cards report-table">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
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
                {rows.length ? (
                  rows.map((doc) => (
                    <tr key={doc.id}>
                      <td className="cell-primary" data-label="Title">
                        <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                      </td>
                      <td data-label="Customer">{doc.customer}</td>
                      <td data-label="Issue date">
                        {formatReportDate(doc.issueDate)}
                      </td>
                      <td data-label="Currency">{doc.currency}</td>
                      <td data-label="Status">
                        <span className={`badge ${doc.status}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="num" data-label="Grand total">
                        {formatMoney(doc.grandTotal, doc.currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="cell-empty muted">
                      No finalized documents in this period
                      {report.currencies.length
                        ? ` for ${report.currencies.join(', ')}`
                        : ''}
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="report-summary-strip">
            <div>
              <span>Documents</span>
              <strong>{report.documentCount}</strong>
            </div>
          </div>

          {report.totalsByCurrency.length ? (
            <div className="currency-totals stack">
              <h3>Totals by currency</h3>
              <div className="table-wrap">
                <table className="table currency-totals-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th className="num">Documents</th>
                      <th className="num">Discount</th>
                      <th className="num">Tax</th>
                      <th className="num">Grand total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.totalsByCurrency.map((row) => (
                      <tr key={row.currency}>
                        <td>{row.currency}</td>
                        <td className="num">{row.documentCount}</td>
                        <td className="num">
                          {formatMoney(row.sumTotalDiscount, row.currency)}
                        </td>
                        <td className="num">
                          {formatMoney(row.sumTotalTax, row.currency)}
                        </td>
                        <td className="num">
                          {formatMoney(row.sumGrandTotals, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
