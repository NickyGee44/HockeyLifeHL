/**
 * EventBus Implementation
 *
 * Purpose: In-memory pub/sub system for domain events
 *
 * Architecture:
 * - Singleton pattern (one event bus per application instance)
 * - Type-safe event handling with TypeScript generics
 * - Supports specific event type subscriptions and wildcard subscriptions
 * - Async listeners (for I/O operations like sending emails)
 * - Error handling (listener errors don't break other listeners)
 *
 * Phase 1 (Current):
 * - In-memory event bus (suitable for single-server deployment)
 * - Events don't persist across server restarts
 * - Good for MVP and low-traffic scenarios
 *
 * Phase 2 (Future):
 * - Redis Pub/Sub for multi-server deployments
 * - Event persistence (event sourcing)
 * - Replay capabilities
 * - Dead letter queue for failed listeners
 *
 * Usage Example:
 * ```typescript
 * import { eventBus } from '@/lib/events/event-bus';
 *
 * // Subscribe to events
 * eventBus.on('game.rescheduled', async (event) => {
 *   console.log('Game rescheduled:', event.payload.gameId);
 *   await sendNotifications(event);
 * });
 *
 * // Emit events
 * eventBus.emit({
 *   id: uuid(),
 *   type: 'game.rescheduled',
 *   timestamp: new Date(),
 *   leagueId: 'abc-123',
 *   userId: 'user-456',
 *   payload: {
 *     gameId: 'game-789',
 *     oldScheduledAt: '2026-02-01T10:00:00Z',
 *     newScheduledAt: '2026-02-08T10:00:00Z',
 *     reason: 'Weather cancellation',
 *     // ... rest of payload
 *   }
 * });
 * ```
 */

import {
  AnyDomainEvent,
  EventListener,
  EventSubscription,
  EventType,
  IEventBus,
} from "./types";

/**
 * In-Memory Event Bus Implementation
 */
class EventBus implements IEventBus {
  /**
   * Map of event type to array of listeners
   * e.g., { "game.rescheduled": [listener1, listener2] }
   */
  private listeners: Map<EventType, EventListener[]>;

  /**
   * Array of wildcard listeners (notified for ALL events)
   */
  private wildcardListeners: EventListener<AnyDomainEvent>[];

  /**
   * Enable/disable debug logging
   */
  private debug: boolean;

  constructor(options?: { debug?: boolean }) {
    this.listeners = new Map();
    this.wildcardListeners = [];
    this.debug = options?.debug ?? false;

    if (this.debug) {
      console.log("[EventBus] Initialized");
    }
  }

  /**
   * Emit a domain event
   * Notifies all registered listeners (specific + wildcard)
   *
   * Error Handling:
   * - If a listener throws, error is logged but other listeners continue
   * - Async listeners are not awaited (fire-and-forget)
   */
  emit(event: AnyDomainEvent): void {
    if (this.debug) {
      console.log(`[EventBus] Emitting event: ${event.type}`, {
        id: event.id,
        leagueId: event.leagueId,
        userId: event.userId,
      });
    }

    // Notify specific listeners
    const specificListeners = this.listeners.get(event.type) ?? [];
    for (const listener of specificListeners) {
      this.invokeListener(listener, event);
    }

    // Notify wildcard listeners
    for (const listener of this.wildcardListeners) {
      this.invokeListener(listener, event);
    }

    if (this.debug) {
      const listenerCount = specificListeners.length + this.wildcardListeners.length;
      console.log(`[EventBus] Notified ${listenerCount} listeners for ${event.type}`);
    }
  }

  /**
   * Subscribe to a specific event type
   *
   * @param eventType - Event type to subscribe to
   * @param listener - Callback function
   * @returns Subscription handle for unsubscribing
   */
  on<T extends AnyDomainEvent>(
    eventType: T["type"],
    listener: EventListener<T>
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.push(listener as EventListener);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to ${eventType} (${listeners.length} total)`);
    }

    // Return subscription handle
    return {
      unsubscribe: () => {
        const index = listeners.indexOf(listener as EventListener);
        if (index !== -1) {
          listeners.splice(index, 1);
          if (this.debug) {
            console.log(`[EventBus] Unsubscribed from ${eventType}`);
          }
        }
      },
    };
  }

  /**
   * Subscribe to ALL events (wildcard subscription)
   *
   * Use cases:
   * - Logging all domain events
   * - Analytics/metrics collection
   * - Debugging
   * - Audit trail
   *
   * @param listener - Callback function
   * @returns Subscription handle for unsubscribing
   */
  onAny(listener: EventListener<AnyDomainEvent>): EventSubscription {
    this.wildcardListeners.push(listener);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to ALL events (${this.wildcardListeners.length} total)`);
    }

    return {
      unsubscribe: () => {
        const index = this.wildcardListeners.indexOf(listener);
        if (index !== -1) {
          this.wildcardListeners.splice(index, 1);
          if (this.debug) {
            console.log(`[EventBus] Unsubscribed from ALL events`);
          }
        }
      },
    };
  }

  /**
   * Remove all listeners for a specific event type
   *
   * @param eventType - Event type to clear
   */
  off(eventType: EventType): void {
    this.listeners.delete(eventType);

    if (this.debug) {
      console.log(`[EventBus] Removed all listeners for ${eventType}`);
    }
  }

  /**
   * Remove ALL listeners (cleanup)
   *
   * Use when shutting down application or resetting state
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.wildcardListeners = [];

    if (this.debug) {
      console.log(`[EventBus] Removed all listeners`);
    }
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return (this.listeners.get(eventType)?.length ?? 0) + this.wildcardListeners.length;
    }

    let total = this.wildcardListeners.length;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * Invoke a listener with error handling
   *
   * - Catches errors and logs them
   * - Async listeners are fire-and-forget (not awaited)
   * - Errors in one listener don't affect other listeners
   */
  private invokeListener(listener: EventListener, event: AnyDomainEvent): void {
    try {
      const result = listener(event);

      // If listener returns a promise, handle rejections
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error(`[EventBus] Async listener error for ${event.type}:`, error);
          // TODO: Send to error tracking service (Sentry, etc.)
        });
      }
    } catch (error) {
      console.error(`[EventBus] Listener error for ${event.type}:`, error);
      // TODO: Send to error tracking service (Sentry, etc.)
    }
  }
}

/**
 * Singleton event bus instance
 *
 * Import this in your API endpoints and services:
 * ```typescript
 * import { eventBus } from '@/lib/events/event-bus';
 * ```
 */
export const eventBus = new EventBus({
  debug: process.env.NODE_ENV === "development",
});

/**
 * Export class for testing
 */
export { EventBus };
