import { describe, expect, it } from '@jest/globals';
import { formatScheduleAssistantError } from '../ai-chat-error';

describe('formatScheduleAssistantError', () => {
  it('preserves backend retry messaging without duplicating it', () => {
    expect(
      formatScheduleAssistantError(
        new Error('Failed to get AI response. Please try again.')
      )
    ).toBe('Sorry, I ran into an issue: Failed to get AI response. Please try again.');
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(formatScheduleAssistantError(null)).toBe(
      'Sorry, I ran into an issue: Something went wrong'
    );
  });
});
