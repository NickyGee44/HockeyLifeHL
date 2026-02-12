'use client';

import { useState } from 'react';
import { RosterList } from './RosterList';
import { StaffList } from './StaffList';
import { AddPlayerModal } from './AddPlayerModal';
import { AddStaffModal } from './AddStaffModal';

interface TeamRosterManagerProps {
  teamId: string;
  seasonId: string;
}

export function TeamRosterManager({ teamId, seasonId }: TeamRosterManagerProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'staff'>('roster');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [rosterKey, setRosterKey] = useState(0);
  const [staffKey, setStaffKey] = useState(0);

  const handlePlayerAdded = () => {
    setRosterKey((prev) => prev + 1); // Force roster list to refresh
  };

  const handleStaffAdded = () => {
    setStaffKey((prev) => prev + 1); // Force staff list to refresh
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'roster'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Roster
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'staff'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Staff
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'roster') {
                setShowAddPlayerModal(true);
              } else {
                setShowAddStaffModal(true);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {activeTab === 'roster' ? '+ Add Player' : '+ Add Staff'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'roster' ? (
          <RosterList
            key={rosterKey}
            teamId={teamId}
            seasonId={seasonId}
            onEditPlayer={(rosterId) => {
              // TODO: Implement edit player functionality
            }}
            onRemovePlayer={() => {
              setRosterKey((prev) => prev + 1);
            }}
          />
        ) : (
          <StaffList
            key={staffKey}
            teamId={teamId}
            seasonId={seasonId}
            onRemoveStaff={() => {
              setStaffKey((prev) => prev + 1);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        teamId={teamId}
        seasonId={seasonId}
        onPlayerAdded={handlePlayerAdded}
      />

      <AddStaffModal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        teamId={teamId}
        seasonId={seasonId}
        onStaffAdded={handleStaffAdded}
      />
    </div>
  );
}
