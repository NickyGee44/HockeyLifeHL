/**
 * Event Emitter Utilities
 *
 * Purpose: Helper functions for emitting domain events from API endpoints
 *
 * Benefits:
 * - Consistent event structure (auto-generates ID, timestamp)
 * - Type-safe payload validation
 * - Reduces boilerplate in API routes
 * - Centralized error handling
 *
 * Usage Example:
 * ```typescript
 * import { emitGameRescheduled } from '@/lib/events/emitters';
 *
 * // In API route
 * await emitGameRescheduled({
 *   leagueId: 'abc-123',
 *   userId: 'user-456',
 *   gameId: 'game-789',
 *   oldScheduledAt: '2026-02-01T10:00:00Z',
 *   newScheduledAt: '2026-02-08T10:00:00Z',
 *   reason: 'Weather cancellation',
 *   homeTeamId: 'team-1',
 *   awayTeamId: 'team-2',
 *   homeTeamName: 'Sharks',
 *   awayTeamName: 'Eagles',
 *   venueName: 'Rink A',
 *   divisionName: 'Division A',
 * });
 * ```
 */

import { v4 as uuid } from "uuid";
import { eventBus } from "./event-bus";
import {
  GameRescheduledEvent,
  GameCancelledEvent,
  ScoreSubmittedEvent,
  ScoreVerifiedEvent,
  InvoiceCreatedEvent,
  PaymentReceivedEvent,
  PaymentOverdueEvent,
  PlayerJoinedTeamEvent,
  PlayerLeftTeamEvent,
} from "./types";

/**
 * Common event metadata
 */
interface BaseEventMetadata {
  leagueId: string;
  userId?: string;
  source?: string; // e.g., "POST /api/[tenant]/games/[gameId]/reschedule"
  correlationId?: string;
}

// =====================================================
// GAME EVENTS
// =====================================================

/**
 * Emit: Game Rescheduled
 *
 * Call this after successfully rescheduling a game
 */
export function emitGameRescheduled(
  metadata: BaseEventMetadata,
  payload: Omit<GameRescheduledEvent["payload"], "">
): void {
  const event: GameRescheduledEvent = {
    id: uuid(),
    type: "game.rescheduled",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

/**
 * Emit: Game Cancelled
 *
 * Call this after successfully cancelling a game
 */
export function emitGameCancelled(
  metadata: BaseEventMetadata,
  payload: Omit<GameCancelledEvent["payload"], "">
): void {
  const event: GameCancelledEvent = {
    id: uuid(),
    type: "game.cancelled",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

/**
 * Emit: Score Submitted
 *
 * Call this after scorekeeper submits final game score
 */
export function emitScoreSubmitted(
  metadata: BaseEventMetadata,
  payload: Omit<ScoreSubmittedEvent["payload"], "">
): void {
  const event: ScoreSubmittedEvent = {
    id: uuid(),
    type: "game.score_submitted",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

/**
 * Emit: Score Verified
 *
 * Call this after captain verifies game score
 */
export function emitScoreVerified(
  metadata: BaseEventMetadata,
  payload: Omit<ScoreVerifiedEvent["payload"], "">
): void {
  const event: ScoreVerifiedEvent = {
    id: uuid(),
    type: "game.score_verified",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

// =====================================================
// PAYMENT EVENTS
// =====================================================

/**
 * Emit: Invoice Created
 *
 * Call this after creating invoice for team/player
 */
export function emitInvoiceCreated(
  metadata: BaseEventMetadata,
  payload: Omit<InvoiceCreatedEvent["payload"], "">
): void {
  const event: InvoiceCreatedEvent = {
    id: uuid(),
    type: "invoice.created",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

/**
 * Emit: Payment Received
 *
 * Call this after Stripe webhook confirms payment
 */
export function emitPaymentReceived(
  metadata: BaseEventMetadata,
  payload: Omit<PaymentReceivedEvent["payload"], "">
): void {
  const event: PaymentReceivedEvent = {
    id: uuid(),
    type: "payment.received",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

/**
 * Emit: Payment Overdue
 *
 * Call this from cron job when detecting overdue invoices
 */
export function emitPaymentOverdue(
  metadata: BaseEventMetadata,
  payload: Omit<PaymentOverdueEvent["payload"], "">
): void {
  const event: PaymentOverdueEvent = {
    id: uuid(),
    type: "payment.overdue",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

// =====================================================
// TEAM EVENTS
// =====================================================

/**
 * Emit: Player Joined Team
 *
 * Call this after player accepts team invitation
 */
export function emitPlayerJoinedTeam(
  metadata: BaseEventMetadata,
  payload: Omit<PlayerJoinedTeamEvent["payload"], "">
): void {
  const event: PlayerJoinedTeamEvent = {
    id: uuid(),
    type: "team.player_joined",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

/**
 * Emit: Player Left Team
 *
 * Call this after player leaves team or is removed
 */
export function emitPlayerLeftTeam(
  metadata: BaseEventMetadata,
  payload: Omit<PlayerLeftTeamEvent["payload"], "">
): void {
  const event: PlayerLeftTeamEvent = {
    id: uuid(),
    type: "team.player_left",
    timestamp: new Date(),
    leagueId: metadata.leagueId,
    userId: metadata.userId,
    payload,
    metadata: {
      source: metadata.source,
      correlationId: metadata.correlationId,
      environment: process.env.NODE_ENV,
    },
  };

  eventBus.emit(event);
}

// =====================================================
// BULK OPERATIONS
// =====================================================

/**
 * Emit multiple game rescheduled events
 *
 * Useful for bulk reschedule operations
 */
export function emitBulkGameRescheduled(
  metadata: BaseEventMetadata,
  games: Array<Omit<GameRescheduledEvent["payload"], "">>
): void {
  for (const payload of games) {
    emitGameRescheduled(metadata, payload);
  }
}

/**
 * Emit multiple game cancelled events
 *
 * Useful for bulk cancellation operations
 */
export function emitBulkGameCancelled(
  metadata: BaseEventMetadata,
  games: Array<Omit<GameCancelledEvent["payload"], "">>
): void {
  for (const payload of games) {
    emitGameCancelled(metadata, payload);
  }
}
