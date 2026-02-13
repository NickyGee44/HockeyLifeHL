'use client';

/**
 * User Management Component (Admin)
 *
 * Allows admins/owners to manage user accounts:
 * - Unlock locked accounts
 * - Initiate password resets
 * - View recovery requests
 * Uses BRAND-KIT gold/black theme
 */

import { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Key,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Search,
  RefreshCw,
  User,
} from 'lucide-react';
import {
  adminUnlockAccount,
  adminInitiatePasswordReset,
  adminGetRecoveryRequests,
  adminUpdateRecoveryRequest,
} from '@/lib/actions/password-reset';

interface UserAccount {
  id: string;
  email: string;
  full_name: string | null;
  locked_until: string | null;
  failed_login_attempts: number;
}

interface RecoveryRequest {
  id: string;
  email: string;
  recovery_type: string;
  status: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  expired: 'bg-neutral-500/20 text-neutral-400',
};

const TYPE_LABELS = {
  password_reset: "Can't Reset Password",
  account_unlock: 'Account Locked',
  email_change: 'Email Change',
  account_access: 'Account Access',
};

interface UserManagementProps {
  /** List of users in the organization */
  users: UserAccount[];
  /** Callback to refresh user list */
  onRefresh?: () => void;
}

export function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    userId: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Filter users by search
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  // Load recovery requests
  async function loadRecoveryRequests() {
    setLoadingRequests(true);
    const result = await adminGetRecoveryRequests();
    if (result.success && result.data) {
      setRecoveryRequests(result.data);
    }
    setLoadingRequests(false);
  }

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRecoveryRequests(); // eslint-disable-line -- data-fetching when tab changes
    }
  }, [activeTab]);

  // Handle unlock account
  async function handleUnlock(userId: string) {
    setActionLoading(userId);
    setActionResult(null);

    const result = await adminUnlockAccount(userId);

    setActionResult({
      userId,
      success: result.success,
      message: result.success ? 'Account unlocked successfully' : result.error || 'Failed to unlock',
    });

    if (result.success) {
      onRefresh?.();
    }

    setActionLoading(null);

    // Clear result after 3 seconds
    setTimeout(() => setActionResult(null), 3000);
  }

  // Handle password reset
  async function handlePasswordReset(userId: string) {
    setActionLoading(userId);
    setActionResult(null);

    const result = await adminInitiatePasswordReset(userId);

    setActionResult({
      userId,
      success: result.success,
      message: result.success
        ? 'Password reset email sent'
        : result.error || 'Failed to send reset',
    });

    setActionLoading(null);

    // Clear result after 3 seconds
    setTimeout(() => setActionResult(null), 3000);
  }

  // Handle recovery request status update
  async function handleUpdateRequest(
    requestId: string,
    status: 'in_progress' | 'resolved' | 'rejected'
  ) {
    setActionLoading(requestId);

    const result = await adminUpdateRecoveryRequest(requestId, status);

    if (result.success) {
      loadRecoveryRequests();
    }

    setActionLoading(null);
  }

  // Check if user is locked
  function isUserLocked(user: UserAccount): boolean {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-700 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'users'
              ? 'bg-rink-500/10 text-rink-500 border-b-2 border-rink-500'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-rink-500/10 text-rink-500 border-b-2 border-rink-500'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Recovery Requests
          {recoveryRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
              {recoveryRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
            />
          </div>

          {/* User List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">
                          {user.full_name || 'Unknown'}
                        </p>
                        {isUserLocked(user) && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            <Lock className="h-3 w-3" />
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 truncate">{user.email}</p>
                      {user.failed_login_attempts > 0 && (
                        <p className="text-xs text-amber-400 mt-1">
                          {user.failed_login_attempts} failed login attempts
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Unlock Button */}
                      {isUserLocked(user) && (
                        <button
                          onClick={() => handleUnlock(user.id)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 text-sm rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                          Unlock
                        </button>
                      )}

                      {/* Reset Password Button */}
                      <button
                        onClick={() => handlePasswordReset(user.id)}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rink-500/10 text-rink-500 text-sm rounded-lg hover:bg-rink-500/20 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4" />
                        )}
                        Reset Password
                      </button>
                    </div>
                  </div>

                  {/* Action Result */}
                  {actionResult && actionResult.userId === user.id && (
                    <div
                      className={`mt-3 flex items-center gap-2 text-sm ${
                        actionResult.success ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {actionResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {actionResult.message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Recovery Requests Tab */}
      {activeTab === 'requests' && (
        <>
          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={loadRecoveryRequests}
              disabled={loadingRequests}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingRequests ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Request List */}
          {loadingRequests ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-rink-500" />
            </div>
          ) : recoveryRequests.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recovery requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recoveryRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium truncate">{request.email}</p>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-rink-500">
                        {TYPE_LABELS[request.recovery_type as keyof typeof TYPE_LABELS]}
                      </p>
                      <p className="text-sm text-neutral-400 mt-2 line-clamp-2">
                        {request.description}
                      </p>
                      <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(request.created_at).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {request.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleUpdateRequest(request.id, 'in_progress')}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        >
                          Take On
                        </button>
                      </div>
                    )}

                    {request.status === 'in_progress' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleUpdateRequest(request.id, 'resolved')}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleUpdateRequest(request.id, 'rejected')}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UserManagement;
