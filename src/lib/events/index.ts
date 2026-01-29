/**
 * Events Module
 *
 * Centralized export for event-driven architecture
 *
 * Usage:
 * ```typescript
 * import { eventBus, emitGameRescheduled } from '@/lib/events';
 * ```
 */

// Event bus
export { eventBus, EventBus } from "./event-bus";

// Event types
export * from "./types";

// Event emitters
export * from "./emitters";
