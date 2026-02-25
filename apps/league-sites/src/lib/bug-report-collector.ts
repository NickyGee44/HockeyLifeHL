export type BugReportCategory = 'bug' | 'visual' | 'confusing' | 'suggestion' | 'other';

export interface LogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface NetworkErrorEntry {
  url: string;
  method: string;
  status: number;
  responsePreview?: string;
  timestamp: string;
}

export interface InteractionEntry {
  type: 'click' | 'submit';
  target: string;
  path: string;
  timestamp: string;
}

export interface ErrorInfo {
  type: 'error' | 'unhandledrejection';
  message: string;
  stack?: string;
  timestamp: string;
}

export interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  timezone: string;
}

export interface CollectedBugReportData {
  url: string;
  routeParams: Record<string, string>;
  browserInfo: BrowserInfo;
  consoleLogs: LogEntry[];
  networkErrors: NetworkErrorEntry[];
  navigationHistory: string[];
  userInteractions: InteractionEntry[];
  errorState: {
    unhandledErrors: ErrorInfo[];
  };
  performanceData: {
    pageLoadMs: number;
  };
}

const MAX_LOGS = 50;
const MAX_NETWORK_ERRORS = 20;
const MAX_NAVIGATION = 10;
const MAX_INTERACTIONS = 5;
const MAX_UNHANDLED_ERRORS = 10;
const MAX_TOTAL_BYTES = 100 * 1024;
const MAX_SCREENSHOT_BYTES = 500 * 1024;

const SECRET_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-_.=]+/gi,
  /eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g,
  /\b(?:api[_-]?key|token|secret|password|passwd|authorization)\b\s*[:=]\s*['\"]?[^'\"\s,;]+/gi,
  /\bsk_[A-Za-z0-9]{16,}\b/g,
];

const UUID_REPLACE_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const UUID_TEST_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function sanitizeText(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, '[redacted]');
  }
  return output;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatConsoleArgs(args: unknown[]): string {
  return sanitizeText(
    args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        return safeJsonStringify(arg);
      })
      .join(' ')
  );
}

function normalizePath(pathname: string): string {
  return pathname.replace(UUID_REPLACE_PATTERN, ':id');
}

class BugReportCollector {
  private static instance: BugReportCollector | null = null;

  private initialized = false;
  private consoleLogs: LogEntry[] = [];
  private networkErrors: NetworkErrorEntry[] = [];
  private navigationHistory: string[] = [];
  private userInteractions: InteractionEntry[] = [];
  private unhandledErrors: ErrorInfo[] = [];
  private hasConsoleError = false;

  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  private originalFetch: typeof fetch | null = null;
  private observersCleanup: Array<() => void> = [];

  static getInstance(): BugReportCollector {
    if (!BugReportCollector.instance) {
      BugReportCollector.instance = new BugReportCollector();
    }
    return BugReportCollector.instance;
  }

  init() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    this.pushNavigation(window.location.pathname + window.location.search);
    this.patchConsole();
    this.patchFetch();
    this.bindNavigationTracking();
    this.bindInteractionTracking();
    this.bindErrorTracking();
  }

  getHasConsoleError(): boolean {
    return this.hasConsoleError || this.unhandledErrors.length > 0;
  }

  getReport(): CollectedBugReportData {
    const report: CollectedBugReportData = {
      url: window.location.href,
      routeParams: this.getRouteParams(),
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      consoleLogs: [...this.consoleLogs],
      networkErrors: [...this.networkErrors],
      navigationHistory: [...this.navigationHistory],
      userInteractions: [...this.userInteractions],
      errorState: {
        unhandledErrors: [...this.unhandledErrors],
      },
      performanceData: {
        pageLoadMs: Math.round(performance.now()),
      },
    };

    const capped = this.capToMemoryBudget(report);
    return capped;
  }

  async captureScreenshot(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const html2canvas = (window as any).html2canvas as
        | ((
            element: HTMLElement,
            options?: Record<string, unknown>
          ) => Promise<HTMLCanvasElement>)
        | undefined;
      if (!html2canvas) return null;
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        backgroundColor: null,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const bytes = Math.floor((dataUrl.length * 3) / 4);

      if (bytes > MAX_SCREENSHOT_BYTES) {
        return null;
      }

      return dataUrl;
    } catch {
      return null;
    }
  }

  dispose() {
    for (const fn of this.observersCleanup) fn();
    this.observersCleanup = [];

    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    this.initialized = false;
  }

  private pushLog(entry: LogEntry) {
    this.consoleLogs.push(entry);
    if (this.consoleLogs.length > MAX_LOGS) {
      this.consoleLogs.shift();
    }
  }

  private pushNetworkError(entry: NetworkErrorEntry) {
    this.networkErrors.push(entry);
    if (this.networkErrors.length > MAX_NETWORK_ERRORS) {
      this.networkErrors.shift();
    }
  }

  private pushNavigation(path: string) {
    const normalized = normalizePath(path);
    if (this.navigationHistory[this.navigationHistory.length - 1] === normalized) {
      return;
    }

    this.navigationHistory.push(normalized);
    if (this.navigationHistory.length > MAX_NAVIGATION) {
      this.navigationHistory.shift();
    }
  }

  private pushInteraction(entry: InteractionEntry) {
    this.userInteractions.push(entry);
    if (this.userInteractions.length > MAX_INTERACTIONS) {
      this.userInteractions.shift();
    }
  }

  private pushUnhandledError(entry: ErrorInfo) {
    this.unhandledErrors.push(entry);
    if (this.unhandledErrors.length > MAX_UNHANDLED_ERRORS) {
      this.unhandledErrors.shift();
    }
  }

  private patchConsole() {
    (['log', 'warn', 'error'] as const).forEach((level) => {
      const original = this.originalConsole[level];

      console[level] = (...args: unknown[]) => {
        const message = formatConsoleArgs(args);
        this.pushLog({
          level,
          message,
          timestamp: new Date().toISOString(),
        });

        if (level === 'error') {
          this.hasConsoleError = true;
        }

        original(...args);
      };
    });
  }

  private patchFetch() {
    if (typeof window.fetch !== 'function') return;

    this.originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const url = input instanceof Request ? input.url : String(input);

      try {
        const response = await this.originalFetch!(input, init);
        if (response.status >= 400) {
          let responsePreview = '';
          try {
            const text = await response.clone().text();
            responsePreview = sanitizeText(text.slice(0, 200));
          } catch {
            responsePreview = '';
          }

          this.pushNetworkError({
            url,
            method,
            status: response.status,
            responsePreview,
            timestamp: new Date().toISOString(),
          });
        }

        return response;
      } catch (error) {
        this.pushNetworkError({
          url,
          method,
          status: 0,
          responsePreview: sanitizeText(error instanceof Error ? error.message : String(error)),
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    };
  }

  private bindNavigationTracking() {
    const capture = () => {
      this.pushNavigation(window.location.pathname + window.location.search);
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      capture();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      capture();
    };

    window.addEventListener('popstate', capture);

    this.observersCleanup.push(() => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', capture);
    });
  }

  private bindInteractionTracking() {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const descriptor = this.buildElementDescriptor(target);
      this.pushInteraction({
        type: 'click',
        target: descriptor,
        path: normalizePath(window.location.pathname),
        timestamp: new Date().toISOString(),
      });
    };

    const onSubmit = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const descriptor = this.buildElementDescriptor(target);
      this.pushInteraction({
        type: 'submit',
        target: descriptor,
        path: normalizePath(window.location.pathname),
        timestamp: new Date().toISOString(),
      });
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);

    this.observersCleanup.push(() => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    });
  }

  private bindErrorTracking() {
    const onError = (event: ErrorEvent) => {
      const message = sanitizeText(event.message || 'Unknown error');
      this.pushUnhandledError({
        type: 'error',
        message,
        stack: sanitizeText(event.error?.stack || ''),
        timestamp: new Date().toISOString(),
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = sanitizeText(
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : safeJsonStringify(reason)
      );

      this.pushUnhandledError({
        type: 'unhandledrejection',
        message,
        stack: reason instanceof Error ? sanitizeText(reason.stack || '') : undefined,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    this.observersCleanup.push(() => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    });
  }

  private buildElementDescriptor(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = Array.from(element.classList)
      .filter((name) => name && name.length < 30)
      .slice(0, 2)
      .map((name) => `.${name}`)
      .join('');

    const role = element.getAttribute('role');
    const type = (element as HTMLInputElement).type;
    const ariaLabel = element.getAttribute('aria-label');

    const hints = [role ? `[role=${role}]` : '', type ? `[type=${type}]` : '', ariaLabel ? `[aria-label=${ariaLabel}]` : '']
      .filter(Boolean)
      .join('');

    return `${tag}${id}${classes}${hints}`.slice(0, 120);
  }

  private getRouteParams(): Record<string, string> {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const params: Record<string, string> = {};

    parts.forEach((part, index) => {
      if (UUID_TEST_PATTERN.test(part)) {
        params[`segment_${index}`] = ':id';
      }
    });

    return params;
  }

  private capToMemoryBudget(report: CollectedBugReportData): CollectedBugReportData {
    const clone: CollectedBugReportData = {
      ...report,
      consoleLogs: [...report.consoleLogs],
      networkErrors: [...report.networkErrors],
      navigationHistory: [...report.navigationHistory],
      userInteractions: [...report.userInteractions],
      errorState: {
        unhandledErrors: [...report.errorState.unhandledErrors],
      },
    };

    while (new Blob([JSON.stringify(clone)]).size > MAX_TOTAL_BYTES) {
      if (clone.consoleLogs.length > 10) {
        clone.consoleLogs.shift();
        continue;
      }
      if (clone.networkErrors.length > 5) {
        clone.networkErrors.shift();
        continue;
      }
      if (clone.navigationHistory.length > 5) {
        clone.navigationHistory.shift();
        continue;
      }
      if (clone.userInteractions.length > 3) {
        clone.userInteractions.shift();
        continue;
      }
      if (clone.errorState.unhandledErrors.length > 3) {
        clone.errorState.unhandledErrors.shift();
        continue;
      }
      break;
    }

    return clone;
  }
}

export function getBugReportCollector(): BugReportCollector {
  return BugReportCollector.getInstance();
}
