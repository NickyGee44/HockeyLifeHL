'use client';

import { useState, useEffect } from 'react';
import { StaffRole } from '@/lib/actions/roster';

interface StaffMember {
  id: string;
  person_id: string;
  role: StaffRole;
  start_date: string;
  end_date?: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface StaffListProps {
  teamId: string;
  seasonId: string;
  onRemoveStaff?: (staffId: string) => void;
}

export function StaffList({ teamId, seasonId, onRemoveStaff }: StaffListProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchStaff is a data-fetching function that depends on teamId and seasonId
  }, [teamId, seasonId]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}/staff?seasonId=${seasonId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch staff');
      }

      const data = await response.json();
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/staff/${staffId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove staff member');
      }

      // Refresh staff list
      await fetchStaff();

      if (onRemoveStaff) {
        onRemoveStaff(staffId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove staff member');
    }
  };

  const formatRole = (role: StaffRole): string => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoleIcon = (role: StaffRole): string => {
    switch (role) {
      case 'Head Coach':
        return '👔';
      case 'Assistant Coach':
        return '🧑‍🏫';
      case 'Manager':
        return '📋';
      case 'Trainer':
        return '🏥';
      case 'Equipment Manager':
        return '🛠️';
      case 'Other':
      default:
        return '👤';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Loading staff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchStaff}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No staff members added yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {staff.map((member) => (
        <div
          key={member.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{getRoleIcon(member.role)}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{member.profiles.full_name}</h3>
                <p className="text-sm text-gray-600">{formatRole(member.role)}</p>
                <p className="text-xs text-gray-500 mt-1">{member.profiles.email}</p>
              </div>
            </div>
            <button
              onClick={() => handleRemoveStaff(member.id)}
              className="text-red-600 hover:text-red-800 text-sm"
              title="Remove staff member"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
