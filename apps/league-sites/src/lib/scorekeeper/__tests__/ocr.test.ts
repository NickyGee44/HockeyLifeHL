import { describe, expect, it } from '@jest/globals';
import { parseOcrAnalysisResult } from '@/lib/scorekeeper/ocr';

describe('score sheet OCR parsing', () => {
  it('extracts and sorts goal/penalty events from structured OCR payload', () => {
    const events = parseOcrAnalysisResult({
      goals: [
        {
          period: 2,
          timeMinutes: 8,
          timeSeconds: 10,
          teamType: 'away',
          scorerJersey: 17,
          assist1Jersey: null,
          assist2Jersey: null,
        },
      ],
      penalties: [
        {
          period: 1,
          timeMinutes: 2,
          timeSeconds: 45,
          teamType: 'home',
          playerJersey: 9,
          type: 'Hooking',
          minutes: 2,
        },
      ],
    });

    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe('penalty');
    expect(events[1].kind).toBe('goal');
    expect(events[0].id).toBe('evt-1');
    expect(events[1].id).toBe('evt-0');
  });

  it('falls back cleanly when OCR payload is malformed (manual review fallback)', () => {
    const events = parseOcrAnalysisResult({
      goals: [{ scorerJersey: 'NaN', teamType: 'unknown' }],
      penalties: 'not-an-array',
    });

    expect(events).toEqual([]);
  });
});

