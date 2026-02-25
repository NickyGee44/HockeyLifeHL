'use client';

import * as React from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Save } from 'lucide-react';
import type { BugReportRow, BugReportStatus } from '@/lib/actions/bug-reports';
import { updateBugReportStatus } from '@/lib/actions/bug-reports';

interface Props {
  leagueId: string;
  initialReports: BugReportRow[];
  ui: {
    openBugs: string;
    criticalBugs: string;
    reportsThisWeek: string;
    resolvedThisMonth: string;
    allStatuses: string;
    allSeverities: string;
    allCategories: string;
    date: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    reports: string;
    actions: string;
    fullDescription: string;
    expectedBehavior: string;
    screenshot: string;
    browserInfo: string;
    consoleErrors: string;
    failedNetworkRequests: string;
    navigationTrail: string;
    userInteractions: string;
    quickActions: string;
    resolutionNotes: string;
    saveNotes: string;
    noResults: string;
  };
  labels: {
    status: Record<BugReportStatus, string>;
    severity: Record<string, string>;
    category: Record<string, string>;
  };
}

type SortKey =
  | 'created_at'
  | 'description'
  | 'category'
  | 'severity'
  | 'status'
  | 'report_count';

export function BugReportsDashboardClient({ leagueId, initialReports, ui, labels }: Props) {
  const [reports, setReports] = React.useState(initialReports);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [severityFilter, setSeverityFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortKey>('created_at');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [notesById, setNotesById] = React.useState<Record<string, string>>({});

  const filteredReports = React.useMemo(() => {
    const filtered = reports.filter((report) => {
      if (statusFilter !== 'all' && report.status !== statusFilter) return false;
      if (severityFilter !== 'all' && report.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && report.category !== categoryFilter) return false;
      if (fromDate && new Date(report.created_at) < new Date(fromDate)) return false;
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (new Date(report.created_at) > to) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a[sortBy];
      const bv = b[sortBy];

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }

      return String(av).localeCompare(String(bv)) * dir;
    });

    return filtered;
  }, [reports, statusFilter, severityFilter, categoryFilter, fromDate, toDate, sortBy, sortDir]);

  const metrics = React.useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      open: reports.filter((r) => ['new', 'investigating', 'fix_deployed'].includes(r.status)).length,
      critical: reports.filter((r) => r.severity === 'critical').length,
      thisWeek: reports.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length,
      resolvedThisMonth: reports.filter(
        (r) => ['closed', 'wont_fix', 'duplicate'].includes(r.status) && new Date(r.updated_at) >= monthStart
      ).length,
    };
  }, [reports]);

  const handleSort = (next: SortKey) => {
    if (sortBy === next) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(next);
    setSortDir('desc');
  };

  const setStatus = async (reportId: string, status: BugReportStatus) => {
    setSavingId(reportId);
    const response = await updateBugReportStatus({ leagueId, reportId, status });
    if (response.success) {
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    }
    setSavingId(null);
  };

  const saveNotes = async (reportId: string) => {
    setSavingId(reportId);
    const response = await updateBugReportStatus({
      leagueId,
      reportId,
      resolutionNotes: notesById[reportId] ?? '',
    });
    if (response.success) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, resolution_notes: notesById[reportId] ?? null } : r
        )
      );
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label={ui.openBugs} value={metrics.open} />
        <MetricCard label={ui.criticalBugs} value={metrics.critical} tone="red" />
        <MetricCard label={ui.reportsThisWeek} value={metrics.thisWeek} tone="blue" />
        <MetricCard label={ui.resolvedThisMonth} value={metrics.resolvedThisMonth} tone="green" />
      </div>

      <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            ['all', ui.allStatuses],
            ['new', labels.status.new],
            ['investigating', labels.status.investigating],
            ['fix_deployed', labels.status.fix_deployed],
            ['closed', labels.status.closed],
            ['duplicate', labels.status.duplicate],
            ['wont_fix', labels.status.wont_fix],
          ]} />

          <Select value={severityFilter} onChange={setSeverityFilter} options={[
            ['all', ui.allSeverities],
            ['critical', labels.severity.critical],
            ['high', labels.severity.high],
            ['medium', labels.severity.medium],
            ['low', labels.severity.low],
          ]} />

          <Select value={categoryFilter} onChange={setCategoryFilter} options={[
            ['all', ui.allCategories],
            ['bug', labels.category.bug],
            ['visual', labels.category.visual],
            ['confusing', labels.category.confusing],
            ['suggestion', labels.category.suggestion],
            ['other', labels.category.other],
          ]} />

          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"
          />

          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-neutral-900 text-neutral-300">
            <tr>
              <Header onClick={() => handleSort('created_at')}>{ui.date}</Header>
              <Header onClick={() => handleSort('description')}>{ui.description}</Header>
              <Header onClick={() => handleSort('category')}>{ui.category}</Header>
              <Header onClick={() => handleSort('severity')}>{ui.severity}</Header>
              <Header onClick={() => handleSort('status')}>{ui.status}</Header>
              <Header onClick={() => handleSort('report_count')}>{ui.reports}</Header>
              <Header>{ui.actions}</Header>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-neutral-950/60">
            {filteredReports.map((report) => {
              const isExpanded = expanded === report.id;

              return (
                <React.Fragment key={report.id}>
                  <tr
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => setExpanded(isExpanded ? null : report.id)}
                  >
                    <Cell>{new Date(report.created_at).toLocaleDateString()}</Cell>
                    <Cell>{truncate(report.description, 80)}</Cell>
                    <Cell>{labels.category[report.category] || report.category}</Cell>
                    <Cell>{labels.severity[report.severity] || report.severity}</Cell>
                    <Cell>{labels.status[report.status] || report.status}</Cell>
                    <Cell>{report.report_count}</Cell>
                    <Cell>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Cell>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-neutral-900/50 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-3">
                            <Panel label={ui.fullDescription} value={report.description} />
                            {report.expected_behavior && (
                              <Panel label={ui.expectedBehavior} value={report.expected_behavior} />
                            )}
                            {report.screenshot_url && report.screenshot_url.startsWith('data:image/') && (
                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{ui.screenshot}</p>
                                <img
                                  src={report.screenshot_url}
                                  alt="Bug report screenshot"
                                  className="max-h-64 rounded-lg border border-white/10"
                                />
                              </div>
                            )}
                            <div>
                              <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{ui.browserInfo}</p>
                              <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-neutral-950 p-3 text-xs text-neutral-300">
                                {JSON.stringify(report.browser_info || {}, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <LogPanel title={ui.consoleErrors} data={report.console_logs} />
                            <LogPanel title={ui.failedNetworkRequests} data={report.network_errors} />
                            <div>
                              <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{ui.navigationTrail}</p>
                              <pre className="max-h-24 overflow-auto rounded-lg border border-white/10 bg-neutral-950 p-3 text-xs text-neutral-300">
                                {(report.navigation_history || []).join(' -> ') || '-'}
                              </pre>
                            </div>
                            <LogPanel title={ui.userInteractions} data={report.user_interactions} />

                            <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
                              <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">{ui.quickActions}</p>
                              <div className="mb-3 flex flex-wrap gap-2">
                                {(['investigating', 'closed', 'wont_fix', 'duplicate'] as BugReportStatus[]).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => setStatus(report.id, status)}
                                    disabled={savingId === report.id}
                                    className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                                  >
                                    {labels.status[status] || status}
                                  </button>
                                ))}
                              </div>

                              <textarea
                                rows={3}
                                value={notesById[report.id] ?? report.resolution_notes ?? ''}
                                onChange={(event) =>
                                  setNotesById((prev) => ({ ...prev, [report.id]: event.target.value }))
                                }
                                className="w-full resize-none rounded-md border border-white/20 bg-neutral-900 px-2.5 py-2 text-xs text-white"
                                placeholder={ui.resolutionNotes}
                              />
                              <button
                                type="button"
                                onClick={() => saveNotes(report.id)}
                                disabled={savingId === report.id}
                                className="mt-2 inline-flex items-center gap-1 rounded-md bg-rink-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
                              >
                                <Save className="h-3.5 w-3.5" /> {ui.saveNotes}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredReports.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-neutral-500">
                  <div className="inline-flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {ui.noResults}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'red' | 'blue' | 'green' }) {
  const color = {
    neutral: 'text-white',
    red: 'text-red-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Header({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      className="px-4 py-3 text-left font-medium"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </th>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-neutral-200">{children}</td>;
}

function Panel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-neutral-950 p-3 text-sm text-neutral-200">
        {value}
      </p>
    </div>
  );
}

function LogPanel({ title, data }: { title: string; data: Array<Record<string, unknown>> | null | undefined }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{title}</p>
      <pre className="max-h-28 overflow-auto rounded-lg border border-white/10 bg-neutral-950 p-3 text-xs text-neutral-300">
        {JSON.stringify(data || [], null, 2)}
      </pre>
    </div>
  );
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}
