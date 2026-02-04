'use client';

import { useState } from 'react';
import { Button } from '@hockey-life/ui';
import { removeOrganizationMember, updateMemberRole } from '@/lib/actions/organization';
import { Trash2, Crown, Shield, User as UserIcon } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'inactive';
  invited_at: string;
  joined_at?: string | null;
  profiles?: {
    email?: string;
    full_name?: string;
  };
}

interface MembersTableProps {
  members: Member[];
  organizationId: string;
  currentUserId: string;
}

export function MembersTable({ members, organizationId, currentUserId }: MembersTableProps) {
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: 'admin' | 'member') {
    setUpdatingMember(memberId);

    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);
      formData.append('memberId', memberId);
      formData.append('role', newRole);

      await updateMemberRole(formData);
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setUpdatingMember(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    setRemovingMember(memberId);

    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);
      formData.append('memberId', memberId);

      await removeOrganizationMember(formData);
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setRemovingMember(null);
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No team members yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Member
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Joined
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isOwner = member.role === 'owner';
            const isUpdating = updatingMember === member.id;
            const isRemoving = removingMember === member.id;

            return (
              <tr key={member.id}>
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {member.profiles?.full_name || 'Unknown User'}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {member.profiles?.email || 'No email'}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    {isOwner || isCurrentUser ? (
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {member.role}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'member')}
                        disabled={isUpdating}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  {getStatusBadge(member.status)}
                </td>
                <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                  {member.joined_at
                    ? new Date(member.joined_at).toLocaleDateString()
                    : 'Pending'}
                </td>
                <td className="py-4 px-4 text-right">
                  {!isOwner && !isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
