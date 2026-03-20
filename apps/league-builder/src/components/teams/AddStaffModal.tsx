'use client';

import { useState, useEffect } from 'react';
import { StaffRole } from '@/lib/actions/roster';

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  seasonId: string;
  leagueId: string;
  onStaffAdded: () => void;
}

export function AddStaffModal({
  isOpen,
  onClose,
  teamId,
  seasonId,
  leagueId,
  onStaffAdded,
}: AddStaffModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<SearchResult | null>(null);
  const [role, setRole] = useState<StaffRole>('Head Coach');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/leagues/${leagueId}/players/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        // Silently fail search
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, leagueId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPerson) {
      setError('Please search for and select a person');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/teams/${teamId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: selectedPerson.id,
          seasonId,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add staff member');
      }

      resetForm();
      onStaffAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPerson(null);
    setRole('Head Coach');
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const staffRoles: { value: StaffRole; label: string }[] = [
    { value: 'Head Coach', label: 'Head Coach' },
    { value: 'Assistant Coach', label: 'Assistant Coach' },
    { value: 'Manager', label: 'Team Manager' },
    { value: 'Trainer', label: 'Trainer' },
    { value: 'Equipment Manager', label: 'Equipment Manager' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Add Staff Member</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Person
              </label>
              {selectedPerson ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedPerson.full_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPerson(null);
                      setSearchQuery('');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Search by name..."
                    disabled={loading}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 text-gray-400 text-xs">Searching...</div>
                  )}
                  {searchResults.length > 0 && !selectedPerson && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            setSelectedPerson(person);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-900"
                        >
                          {person.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500">
                      No people found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
                required
              >
                {staffRoles.map((staffRole) => (
                  <option key={staffRole.value} value={staffRole.value}>
                    {staffRole.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedPerson}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
