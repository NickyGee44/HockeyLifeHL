interface RulesContentProps {
  content: string;
}

/**
 * Simple markdown-like renderer for league rules content.
 * Handles: headers (# ## ###), paragraphs, unordered lists (- *), ordered lists (1.), bold (**), italic (*).
 */
export function RulesContent({ content }: RulesContentProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let key = 0;

  function flushList() {
    if (!currentList) return;
    const items = currentList.items.map((item, i) => (
      <li key={i} className="text-[var(--color-text-secondary)]">
        <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
      </li>
    ));

    if (currentList.type === 'ul') {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-3 ml-4">
          {items}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-3 ml-4">
          {items}
        </ol>
      );
    }
    currentList = null;
  }

  function formatInline(text: string): string {
    // Bold: **text**
    let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)] font-semibold">$1</strong>');
    // Italic: *text* (but not **)
    formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    return formatted;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4
          key={key++}
          className="text-base font-semibold text-[var(--color-text-primary)] mt-6 mb-2"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(4)) }}
        />
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3
          key={key++}
          className="text-lg font-semibold text-[var(--color-text-primary)] mt-6 mb-2"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(3)) }}
        />
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2
          key={key++}
          className="text-xl font-bold text-[var(--color-text-primary)] mt-8 mb-3"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2)) }}
        />
      );
      continue;
    }

    // Unordered list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.slice(2);
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: 'ul', items: [itemText] };
      }
      continue;
    }

    // Ordered list items
    const orderedMatch = trimmed.match(/^(\d+)\.\s(.+)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[2];
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: 'ol', items: [itemText] };
      }
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p
        key={key++}
        className="text-[var(--color-text-secondary)] my-2 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
      />
    );
  }

  flushList();

  return <div className="prose-league">{elements}</div>;
}
