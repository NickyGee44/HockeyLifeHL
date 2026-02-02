'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GameEditModal, CancelGameModal } from '@/components/games';
import type { Game } from '@/lib/actions/games';
import { Edit, XCircle } from 'lucide-react';

interface GameDetailClientProps {
  game: Game;
  leagueId: string;
}

export function GameDetailClient({ game, leagueId }: GameDetailClientProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
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

  const canModify = !['completed', 'cancelled'].includes(currentGame.status);

  if (!canModify) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditModal(true)}
          className="gap-2 border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
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
    </>
  );
}
