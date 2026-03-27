const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const ANTHROPIC_FEATURES = {
  scheduleChat: {
    defaultModel: 'claude-3-5-haiku-20241022',
    envVar: 'ANTHROPIC_MODEL_SCHEDULE_CHAT',
    unavailableMessage: 'AI assistant is temporarily unavailable.',
    label: 'schedule chat',
  },
  articleGeneration: {
    defaultModel: 'claude-sonnet-4-20250514',
    envVar: 'ANTHROPIC_MODEL_ARTICLE_GENERATION',
    unavailableMessage: 'AI article generation is temporarily unavailable.',
    label: 'article generation',
  },
  pageBlocks: {
    defaultModel: 'claude-sonnet-4-20250514',
    envVar: 'ANTHROPIC_MODEL_PAGE_BLOCKS',
    unavailableMessage: 'AI page generation is temporarily unavailable.',
    label: 'page block generation',
  },
} as const;

export type AnthropicFeature = keyof typeof ANTHROPIC_FEATURES;

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicMessagesResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

export class AnthropicRouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly userMessage: string
  ) {
    super(userMessage);
    this.name = 'AnthropicRouteError';
  }
}

export function getAnthropicConfig(feature: AnthropicFeature) {
  const featureConfig = ANTHROPIC_FEATURES[feature];
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    throw new AnthropicRouteError(503, featureConfig.unavailableMessage);
  }

  const override = process.env[featureConfig.envVar]?.trim();

  return {
    apiKey,
    model: override || featureConfig.defaultModel,
    unavailableMessage: featureConfig.unavailableMessage,
    label: featureConfig.label,
  };
}

export async function callAnthropicMessages(args: {
  feature: AnthropicFeature;
  system: string;
  messages: AnthropicMessage[];
  maxTokens: number;
}): Promise<AnthropicMessagesResponse> {
  const response = await requestAnthropicMessages({
    ...args,
    stream: false,
  });

  try {
    return (await response.json()) as AnthropicMessagesResponse;
  } catch (error) {
    console.error(`Anthropic ${ANTHROPIC_FEATURES[args.feature].label} returned invalid JSON:`, error);
    throw new AnthropicRouteError(502, ANTHROPIC_FEATURES[args.feature].unavailableMessage);
  }
}

export async function callAnthropicMessagesStream(args: {
  feature: AnthropicFeature;
  system: string;
  messages: AnthropicMessage[];
  maxTokens: number;
}): Promise<ReadableStream<Uint8Array>> {
  const response = await requestAnthropicMessages({
    ...args,
    stream: true,
  });

  if (!response.body) {
    console.error(`Anthropic ${ANTHROPIC_FEATURES[args.feature].label} returned no stream body.`);
    throw new AnthropicRouteError(502, ANTHROPIC_FEATURES[args.feature].unavailableMessage);
  }

  return createAnthropicTextDeltaStream(response.body);
}

async function requestAnthropicMessages(args: {
  feature: AnthropicFeature;
  system: string;
  messages: AnthropicMessage[];
  maxTokens: number;
  stream: boolean;
}) {
  const config = getAnthropicConfig(args.feature);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: args.maxTokens,
        stream: args.stream,
        system: args.system,
        messages: args.messages,
      }),
    });

    if (!response.ok) {
      const summary = await summarizeAnthropicError(response);
      console.error(`Anthropic ${config.label} error:`, response.status, summary);
      throw new AnthropicRouteError(502, config.unavailableMessage);
    }

    return response;
  } catch (error) {
    if (error instanceof AnthropicRouteError) {
      throw error;
    }

    console.error(`Anthropic ${config.label} request failed:`, error);
    throw new AnthropicRouteError(502, config.unavailableMessage);
  }
}

export function createAnthropicTextDeltaStream(source: ReadableStream<Uint8Array>) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';

      const flushBuffer = () => {
        let newlineIndex = buffer.indexOf('\n');

        while (newlineIndex !== -1) {
          const rawLine = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          processSseLine(rawLine, controller, encoder);
          newlineIndex = buffer.indexOf('\n');
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          flushBuffer();
        }

        if (buffer) {
          processSseLine(buffer, controller, encoder);
        }
      } catch (error) {
        controller.error(error);
        return;
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });
}

function processSseLine(
  rawLine: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const line = rawLine.trim();
  if (!line.startsWith('data:')) {
    return;
  }

  const payload = line.slice(5).trimStart();
  if (!payload || payload === '[DONE]') {
    return;
  }

  try {
    const event = JSON.parse(payload) as {
      type?: string;
      delta?: { text?: string };
    };

    if (event.type === 'content_block_delta' && event.delta?.text) {
      controller.enqueue(encoder.encode(event.delta.text));
    }
  } catch {
    // Ignore non-JSON SSE lines and partial event metadata.
  }
}

async function summarizeAnthropicError(response: Response) {
  const raw = await response.text();
  if (!raw) {
    return 'empty upstream error response';
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; type?: string };
      message?: string;
      type?: string;
    };

    const summary =
      parsed.error?.message ||
      parsed.message ||
      parsed.error?.type ||
      parsed.type ||
      raw;

    return sanitizeErrorSummary(summary);
  } catch {
    return sanitizeErrorSummary(raw);
  }
}

function sanitizeErrorSummary(summary: string) {
  const normalized = summary.replace(/\s+/g, ' ').trim();
  return normalized.slice(0, 240) || 'unknown upstream error';
}
