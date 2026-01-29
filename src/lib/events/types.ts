/**
 * Domain Event Types
 *
 * Purpose: Type-safe event definitions for the event-driven notification system
 *
 * Architecture:
 * - Domain events are emitted from API endpoints (e.g., POST /games/:id/reschedule)
 * - EventBus broadcasts events to registered listeners
 * - Notification service subscribes to events and creates notification records
 * - Async workers process notification queue (send emails via Resend)
 *
 * Event Flow Example:
 * 1. Admin reschedules game via API
 * 2. API emits GameRescheduledEvent
 * 3. NotificationService receives event
 * 4. Service creates notification records for captains
 * 5. Async worker sends emails
 *
 * Benefits:
 * - Decoupling: API logic separate from notification logic
 * - Extensibility: Easy to add new event listeners (e.g., analytics, webhooks)
 * - Testability: Can test event emission and handling independently
 * - Auditability: All domain events are traceable
 */

// =====================================================
// BASE EVENT TYPE
// =====================================================

/**
 * Base domain event interface
 * All events extend this
 */
export interface DomainEvent {
  /** Unique event identifier */
  id: string;

  /** Event type (e.g., "game.rescheduled") */
  type: string;

  /** When the event occurred */
  timestamp: Date;

  /** League/tenant context */
  leagueId: string;

  /** User who triggered the event (null for system events) */
  userId?: string;

  /** Event-specific payload */
  payload: Record<string, any>;

  /** Event metadata (for debugging, tracing) */
  metadata?: {
    source?: string; // API endpoint that emitted event
    correlationId?: string; // For tracing multi-step workflows
    environment?: string; // production, staging, development
  };
}

// =====================================================
// GAME EVENTS
// =====================================================

/**
 * Event: Game Rescheduled
 *
 * Emitted when: Admin reschedules a game (single or bulk)
 * Triggers: Email notifications to team captains
 */
export interface GameRescheduledEvent extends DomainEvent {
  type: "game.rescheduled";
  payload: {
    gameId: string;
    oldScheduledAt: string; // ISO 8601
    newScheduledAt: string; // ISO 8601
    oldVenueId?: string;
    newVenueId?: string;
    reason: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    venueName: string;
    divisionName: string;
  };
}

/**
 * Event: Game Cancelled
 *
 * Emitted when: Admin cancels a game
 * Triggers: Email notifications to team captains
 */
export interface GameCancelledEvent extends DomainEvent {
  type: "game.cancelled";
  payload: {
    gameId: string;
    scheduledAt: string; // ISO 8601
    reason: string;
    willReschedule: boolean; // true if postponed, false if permanently cancelled
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    venueName: string;
    divisionName: string;
    notes?: string;
  };
}

/**
 * Event: Score Submitted
 *
 * Emitted when: Scorekeeper submits final game score
 * Triggers: Email to captains for verification
 */
export interface ScoreSubmittedEvent extends DomainEvent {
  type: "game.score_submitted";
  payload: {
    gameId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    venueName: string;
    scheduledAt: string; // ISO 8601
    scorekeeperId: string;
    scorekeeperName: string;
    verificationToken: string; // For captain verification link
  };
}

/**
 * Event: Score Verified
 *
 * Emitted when: Captain verifies game score
 * Triggers: (Future) Update standings, unlock next game, etc.
 */
export interface ScoreVerifiedEvent extends DomainEvent {
  type: "game.score_verified";
  payload: {
    gameId: string;
    homeTeamId: string;
    awayTeamId: string;
    captainUserId: string;
    captainTeamId: string;
    verifiedAt: string; // ISO 8601
  };
}

// =====================================================
// PAYMENT EVENTS
// =====================================================

/**
 * Event: Invoice Created
 *
 * Emitted when: Admin creates invoice for team/player
 * Triggers: Payment due notification
 */
export interface InvoiceCreatedEvent extends DomainEvent {
  type: "invoice.created";
  payload: {
    invoiceId: string;
    ownerType: "team" | "player";
    ownerId: string;
    ownerName: string;
    amount: number;
    dueDate: string; // ISO 8601
    description: string;
  };
}

/**
 * Event: Payment Received
 *
 * Emitted when: Stripe webhook confirms payment
 * Triggers: Payment confirmation email
 */
export interface PaymentReceivedEvent extends DomainEvent {
  type: "payment.received";
  payload: {
    invoiceId: string;
    ownerType: "team" | "player";
    ownerId: string;
    ownerName: string;
    amount: number;
    paymentMethod: string;
    stripePaymentIntentId?: string;
  };
}

/**
 * Event: Payment Overdue
 *
 * Emitted when: Cron job detects overdue invoice
 * Triggers: Overdue payment reminder
 */
export interface PaymentOverdueEvent extends DomainEvent {
  type: "payment.overdue";
  payload: {
    invoiceId: string;
    ownerType: "team" | "player";
    ownerId: string;
    ownerName: string;
    amount: number;
    dueDate: string; // ISO 8601
    daysOverdue: number;
  };
}

// =====================================================
// TEAM EVENTS
// =====================================================

/**
 * Event: Player Joined Team
 *
 * Emitted when: Player accepts team invitation
 * Triggers: Welcome email, roster update notification
 */
export interface PlayerJoinedTeamEvent extends DomainEvent {
  type: "team.player_joined";
  payload: {
    teamId: string;
    teamName: string;
    playerId: string;
    playerName: string;
    playerEmail: string;
    captainUserId: string;
  };
}

/**
 * Event: Player Left Team
 *
 * Emitted when: Player leaves team or is removed
 * Triggers: Roster update notification
 */
export interface PlayerLeftTeamEvent extends DomainEvent {
  type: "team.player_left";
  payload: {
    teamId: string;
    teamName: string;
    playerId: string;
    playerName: string;
    reason?: string;
    captainUserId: string;
  };
}

// =====================================================
// UNION TYPE
// =====================================================

/**
 * All domain events
 * Use this for type-safe event handling
 */
export type AnyDomainEvent =
  | GameRescheduledEvent
  | GameCancelledEvent
  | ScoreSubmittedEvent
  | ScoreVerifiedEvent
  | InvoiceCreatedEvent
  | PaymentReceivedEvent
  | PaymentOverdueEvent
  | PlayerJoinedTeamEvent
  | PlayerLeftTeamEvent;

/**
 * Event type string literals
 * For type narrowing and filtering
 */
export type EventType = AnyDomainEvent["type"];

// =====================================================
// EVENT LISTENER TYPES
// =====================================================

/**
 * Event listener function signature
 */
export type EventListener<T extends DomainEvent = AnyDomainEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Event subscription handle
 * Used to unsubscribe from events
 */
export interface EventSubscription {
  unsubscribe: () => void;
}

// =====================================================
// EVENT BUS INTERFACE
// =====================================================

/**
 * Event bus for pub/sub pattern
 *
 * Usage:
 * ```typescript
 * // Emit event
 * eventBus.emit({
 *   id: uuid(),
 *   type: "game.rescheduled",
 *   timestamp: new Date(),
 *   leagueId: "...",
 *   payload: { ... }
 * });
 *
 * // Subscribe to events
 * const subscription = eventBus.on("game.rescheduled", async (event) => {
 *   // Handle event
 * });
 *
 * // Unsubscribe
 * subscription.unsubscribe();
 * ```
 */
export interface IEventBus {
  /**
   * Emit a domain event
   * All registered listeners will be notified
   */
  emit(event: AnyDomainEvent): void;

  /**
   * Subscribe to specific event type
   * Returns subscription handle for unsubscribing
   */
  on<T extends AnyDomainEvent>(
    eventType: T["type"],
    listener: EventListener<T>
  ): EventSubscription;

  /**
   * Subscribe to all events
   * Useful for logging, analytics, debugging
   */
  onAny(listener: EventListener<AnyDomainEvent>): EventSubscription;

  /**
   * Remove all listeners for a specific event type
   */
  off(eventType: EventType): void;

  /**
   * Remove all listeners (cleanup)
   */
  removeAllListeners(): void;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Extract payload type from event
 */
export type EventPayload<T extends DomainEvent> = T["payload"];

/**
 * Type guard for event type checking
 */
export function isEventType<T extends AnyDomainEvent>(
  event: AnyDomainEvent,
  type: T["type"]
): event is T {
  return event.type === type;
}
