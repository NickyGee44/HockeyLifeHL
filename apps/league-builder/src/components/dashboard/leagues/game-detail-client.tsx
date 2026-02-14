'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GameEditModal, CancelGameModal, StatCorrectionModal } from '@/components/games';
import type { Game } from '@/lib/actions/games';
import { Edit, XCircle, ClipboardEdit } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GameDetailClientProps {
  game: Game;
  leagueId: string;
}

export function GameDetailClient({ game }: GameDetailClientProps) {
  const router = useRouter();
  const t = useTranslations('statCorrection');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStatCorrection, setShowStatCorrection] = useState(false);
  const [currentGame, setCurrentGame] = useState(game);

  const handleEditSuccess = (updatedGame: Game) => {
    setCurrentGame(updatedGame);
    setShowEditModal(false);
    router.refresh();
  };

  const handleCancelSuccess = (updatedGame: Game) => {
    setCurrentGame(updatedGame);
    setShowCancelModal(false);
    router.refresh();
  };

  const handleStatCorrectionSuccess = () => {
    setShowStatCorrection(false);
    router.refresh();
  };

  const canModify = !['completed', 'cancelled'].includes(currentGame.status);
  const isCompleted = currentGame.status === 'completed';

  return (
    <>
      <div className="flex items-center gap-2">
        {canModify && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="gap-2 border-rink-500/30 text-rink-500 hover:bg-rink-500/10"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          </>
        )}
        {isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatCorrection(true)}
            className="gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <ClipboardEdit className="w-4 h-4" />
            {t('editStats')}
          </Button>
        )}
      </div>

      {/* Edit Modal */}
      <GameEditModal
        game={currentGame}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={handleEditSuccess}
      />

      {/* Cancel Modal */}
      <CancelGameModal
        game={currentGame}
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onSuccess={handleCancelSuccess}
      />

      {/* Stat Correction Modal */}
      {isCompleted && (
        <StatCorrectionModal
          game={currentGame}
          open={showStatCorrection}
          onOpenChange={setShowStatCorrection}
          onSuccess={handleStatCorrectionSuccess}
        />
      )}
    </>
  );
}
