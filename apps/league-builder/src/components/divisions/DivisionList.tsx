'use client';

/**
 * Division List Component
 *
 * Main client component for managing divisions in a league.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Plus, Trophy, Loader2 } from 'lucide-react';
import { DivisionCard } from './DivisionCard';
import { DivisionFormModal } from './DivisionFormModal';
import { DeleteDivisionModal } from './DeleteDivisionModal';
import { TeamAssignmentModal } from './TeamAssignmentModal';
import {
  getDivisions,
  getDivisionTeams,
  type DivisionWithTeamCount,
} from '@/lib/actions/divisions';

// ==============================================================================
// TYPES
// ==============================================================================

interface DivisionListProps {
  leagueId: string;
  locale: string;
  initialDivisions?: DivisionWithTeamCount[];
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionList({
  leagueId,
  locale,
  initialDivisions = [],
}: DivisionListProps) {
  const t = useTranslations('divisions');
  const router = useRouter();
  const [divisions, setDivisions] = useState<DivisionWithTeamCount[]>(initialDivisions);
  const [divisionTeams, setDivisionTeams] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(initialDivisions.length === 0);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<DivisionWithTeamCount | null>(null);

  // Fetch divisions
  const fetchDivisions = useCallback(async () => {
    setIsLoading(true);
    const result = await getDivisions(leagueId);
    if (result.success) {
      setDivisions(result.data);
      // Fetch teams for each division
      const teamsMap: Record<string, any[]> = {};
      await Promise.all(
        result.data.map(async (div) => {
          const teamsResult = await getDivisionTeams(div.id);
          if (teamsResult.success) {
            teamsMap[div.id] = teamsResult.data;
          }
        })
      );
      setDivisionTeams(teamsMap);
    }
    setIsLoading(false);
  }, [leagueId]);

  // Initial load
  useEffect(() => {
    if (initialDivisions.length === 0) {
      fetchDivisions(); // eslint-disable-line -- data-fetching on mount when no initial data
    } else {
      // Fetch teams for initial divisions
      const fetchTeams = async () => {
        const teamsMap: Record<string, any[]> = {};
        await Promise.all(
          initialDivisions.map(async (div) => {
            const teamsResult = await getDivisionTeams(div.id);
            if (teamsResult.success) {
              teamsMap[div.id] = teamsResult.data;
            }
          })
        );
        setDivisionTeams(teamsMap); // eslint-disable-line -- data-fetching for initial division teams
      };
      fetchTeams();
    }
  }, [fetchDivisions, initialDivisions]);

  // Handlers
  const handleCreateDivision = () => {
    setSelectedDivision(null);
    setShowFormModal(true);
  };

  const handleEditDivision = (division: DivisionWithTeamCount) => {
    setSelectedDivision(division);
    setShowFormModal(true);
  };

  const handleDeleteDivision = (division: DivisionWithTeamCount) => {
    setSelectedDivision(division);
    setShowDeleteModal(true);
  };

  const handleAssignTeams = (division: DivisionWithTeamCount) => {
    setSelectedDivision(division);
    setShowAssignModal(true);
  };

  const handleSuccess = () => {
    fetchDivisions();
    router.refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-rink-500" />
      </div>
    );
  }

  return (
    <>
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-neutral-400">
            {t('description')}
          </p>
        </div>

        <button
          onClick={handleCreateDivision}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
            'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
          )}
        >
          <Plus className="w-4 h-4" />
          {t('createDivision')}
        </button>
      </div>

      {/* Divisions Grid */}
      {divisions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {divisions.map((division) => (
            <DivisionCard
              key={division.id}
              division={division}
              leagueId={leagueId}
              locale={locale}
              onEdit={handleEditDivision}
              onDelete={handleDeleteDivision}
              teams={divisionTeams[division.id] || []}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <Trophy className="w-16 h-16 text-rink-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">{t('noDivisionsYet')}</h3>
          <p className="text-neutral-400 mb-6 max-w-md mx-auto">
            {t('noDivisionsDescription')}
          </p>
          <button
            onClick={handleCreateDivision}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            {t('createFirstDivision')}
          </button>
        </div>
      )}

      {/* Modals */}
      <DivisionFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        leagueId={leagueId}
        division={selectedDivision}
        onSuccess={handleSuccess}
      />

      <DeleteDivisionModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        division={selectedDivision}
        leagueId={leagueId}
        onSuccess={handleSuccess}
      />

      <TeamAssignmentModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        division={selectedDivision}
        leagueId={leagueId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
