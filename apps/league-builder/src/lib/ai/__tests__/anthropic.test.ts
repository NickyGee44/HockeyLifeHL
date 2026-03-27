import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AnthropicRouteError,
  callAnthropicMessages,
  callAnthropicMessagesStream,
  getAnthropicConfig,
} from '../anthropic';

function createSseStream(chunks: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
}

async function readStreamText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

describe('anthropic helpers', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalScheduleModel = process.env.ANTHROPIC_MODEL_SCHEDULE_CHAT;
  const originalArticleModel = process.env.ANTHROPIC_MODEL_ARTICLE_GENERATION;
  const originalPageBlocksModel = process.env.ANTHROPIC_MODEL_PAGE_BLOCKS;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    delete process.env.ANTHROPIC_MODEL_SCHEDULE_CHAT;
    delete process.env.ANTHROPIC_MODEL_ARTICLE_GENERATION;
    delete process.env.ANTHROPIC_MODEL_PAGE_BLOCKS;
    global.fetch = jest.fn<typeof fetch>();
  });

  afterAll(() => {
    global.fetch = originalFetch;

    if (typeof originalApiKey === 'string') {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }

    if (typeof originalScheduleModel === 'string') {
      process.env.ANTHROPIC_MODEL_SCHEDULE_CHAT = originalScheduleModel;
    } else {
      delete process.env.ANTHROPIC_MODEL_SCHEDULE_CHAT;
    }

    if (typeof originalArticleModel === 'string') {
      process.env.ANTHROPIC_MODEL_ARTICLE_GENERATION = originalArticleModel;
    } else {
      delete process.env.ANTHROPIC_MODEL_ARTICLE_GENERATION;
    }

    if (typeof originalPageBlocksModel === 'string') {
      process.env.ANTHROPIC_MODEL_PAGE_BLOCKS = originalPageBlocksModel;
    } else {
      delete process.env.ANTHROPIC_MODEL_PAGE_BLOCKS;
    }
  });

  it('resolves supported default models by feature', () => {
    expect(getAnthropicConfig('scheduleChat').model).toBe('claude-3-5-haiku-20241022');
    expect(getAnthropicConfig('articleGeneration').model).toBe('claude-sonnet-4-20250514');
    expect(getAnthropicConfig('pageBlocks').model).toBe('claude-sonnet-4-20250514');
  });

  it('prefers env overrides when present', () => {
    process.env.ANTHROPIC_MODEL_SCHEDULE_CHAT = 'custom-schedule-model';

    expect(getAnthropicConfig('scheduleChat').model).toBe('custom-schedule-model');
  });

  it('throws a 503 route error when Anthropic is not configured', () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => getAnthropicConfig('scheduleChat')).toThrow(
      new AnthropicRouteError(503, 'AI assistant is temporarily unavailable.')
    );
  });

  it('builds the schedule chat request with the shared model', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ text: 'All set.' }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await callAnthropicMessages({
      feature: 'scheduleChat',
      system: 'System prompt',
      messages: [{ role: 'user', content: 'No games after 10pm' }],
      maxTokens: 256,
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body)) as {
      model: string;
      stream: boolean;
    };

    expect(body.model).toBe('claude-3-5-haiku-20241022');
    expect(body.stream).toBe(false);
  });

  it('maps upstream provider failures to a normalized 502 error', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'The model "claude-haiku-4-20250414" does not exist',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(
      callAnthropicMessages({
        feature: 'scheduleChat',
        system: 'System prompt',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 128,
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 502,
        userMessage: 'AI assistant is temporarily unavailable.',
      })
    );
  });

  it('streams text deltas from Anthropic SSE responses', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(
        createSseStream([
          'event: content_block_delta\n',
          'data: {"type":"content_block_delta","delta":{"text":"No games"}}\n',
          '\n',
          'data: {"type":"content_b',
          'lock_delta","delta":{"text":" after 10pm"}}\n',
          'data: [DONE]\n',
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      )
    );

    const stream = await callAnthropicMessagesStream({
      feature: 'scheduleChat',
      system: 'System prompt',
      messages: [{ role: 'user', content: 'No games after 10pm' }],
      maxTokens: 256,
    });

    await expect(readStreamText(stream)).resolves.toBe('No games after 10pm');
  });
});
