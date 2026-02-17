'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSignedWaivers } from '@/lib/actions/waiver-management';

interface SignedWaiver {
  id: string;
  player_name: string;
  player_email: string;
  agreed_at: string | null;
  season_name: string | null;
  waiver_version: string;
  signature_type: string;
}

interface SignedWaiversTableProps {
  leagueId: string;
}

const PAGE_SIZE = 10;

export function SignedWaiversTable({ leagueId }: SignedWaiversTableProps) {
  const [waivers, setWaivers] = useState<SignedWaiver[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchWaivers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSignedWaivers(leagueId, {
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (result.success && result.data) {
        setWaivers(result.data.waivers);
        setTotal(result.data.total);
      }
    } catch {
      // Silent fail — table shows empty
    } finally {
      setLoading(false);
    }
  }, [leagueId, search, page]);

  useEffect(() => {
    fetchWaivers();
  }, [fetchWaivers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileCheck className="h-5 w-5 text-rink-500" />
          <h2 className="text-lg font-semibold text-white">Signed Waivers</h2>
          {total > 0 && (
            <span className="text-sm text-neutral-500">({total})</span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name..."
            className="pl-9 pr-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent w-48"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          Loading...
        </div>
      ) : waivers.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          {search ? 'No matching waivers found.' : 'No signed waivers yet.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700/50">
                  <th className="text-left text-neutral-400 font-medium py-2 pr-4">
                    Player
                  </th>
                  <th className="text-left text-neutral-400 font-medium py-2 pr-4">
                    Date Agreed
                  </th>
                  <th className="text-left text-neutral-400 font-medium py-2 pr-4">
                    Season
                  </th>
                  <th className="text-left text-neutral-400 font-medium py-2">
                    Version
                  </th>
                </tr>
              </thead>
              <tbody>
                {waivers.map((waiver) => (
                  <tr
                    key={waiver.id}
                    className="border-b border-neutral-800/50 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="text-white font-medium">
                        {waiver.player_name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {waiver.player_email}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">
                      {waiver.agreed_at
                        ? new Date(waiver.agreed_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">
                      {waiver.season_name || '—'}
                    </td>
                    <td className="py-3 text-neutral-300">
                      v{waiver.waiver_version}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-800/50">
              <span className="text-sm text-neutral-500">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
