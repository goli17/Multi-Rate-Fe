type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'pill';
};

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = 'md',
}: SkeletonProps) {
  return (
    <span
      className={`skeleton skeleton-${rounded} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function DocumentsListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading documents">
      <div className="page-header">
        <div className="stack" style={{ gap: '0.5rem', flex: 1 }}>
          <Skeleton width={180} height="2rem" />
          <Skeleton width="55%" height="0.9rem" />
        </div>
        <Skeleton width={140} height="2.5rem" rounded="pill" />
      </div>
      <div className="skeleton-table">
        <div className="skeleton-table-head">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="0.75rem" width={`${60 + (i % 3) * 10}%`} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div className="skeleton-table-row" key={row}>
            {Array.from({ length: 5 }).map((_, col) => (
              <Skeleton
                key={col}
                height="0.95rem"
                width={col === 0 ? '70%' : `${50 + ((row + col) % 4) * 10}%`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentDetailSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading document">
      <div className="panel stack">
        <div className="page-header">
          <div className="stack" style={{ gap: '0.55rem', flex: 1 }}>
            <Skeleton width={120} height="0.8rem" />
            <Skeleton width="45%" height="2rem" />
            <Skeleton width={88} height="1.4rem" rounded="pill" />
          </div>
          <div className="page-actions">
            <Skeleton width={90} height="2.4rem" rounded="pill" />
            <Skeleton width={110} height="2.4rem" rounded="pill" />
          </div>
        </div>
        <div className="row">
          <Skeleton height="2.6rem" />
          <Skeleton height="2.6rem" />
          <Skeleton height="2.6rem" />
        </div>
        <Skeleton width={130} height="2.4rem" rounded="pill" />
      </div>

      <div className="panel stack">
        <Skeleton width={140} height="1.6rem" />
        <div className="skeleton-table">
          <div className="skeleton-table-head skeleton-table-head-wide">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} height="0.75rem" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, row) => (
            <div className="skeleton-table-row skeleton-table-row-wide" key={row}>
              {Array.from({ length: 7 }).map((_, col) => (
                <Skeleton key={col} height="0.95rem" />
              ))}
            </div>
          ))}
        </div>
        <div className="totals">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="totals-skeleton-card">
              <Skeleton width="50%" height="0.75rem" />
              <Skeleton width="70%" height="1.25rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportTotalsSkeleton() {
  return (
    <div
      className="totals"
      aria-busy="true"
      aria-label="Loading report totals"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="totals-skeleton-card">
          <Skeleton width="45%" height="0.75rem" />
          <Skeleton width="65%" height="1.35rem" />
        </div>
      ))}
    </div>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="auth-page" aria-busy="true" aria-label="Loading">
      <div className="panel auth-card stack">
        <Skeleton width={160} height="1.8rem" />
        <Skeleton width="80%" height="0.9rem" />
        <Skeleton height="2.6rem" />
        <Skeleton height="2.6rem" />
        <Skeleton height="2.6rem" rounded="pill" />
      </div>
    </div>
  );
}
