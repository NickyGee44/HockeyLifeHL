'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import {
  Palette,
  Image as ImageIcon,
  Type,
  Navigation,
  Share2,
  Search,
  Code,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';
import { useEditor } from './EditorContext';
import { PANEL_CONFIG } from './constants';
import type { EditorPanel } from './types';

// ---------------------------------------------------------------------------
// Icon lookup -- maps the string icon name from PANEL_CONFIG to a component.
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette,
  Image: ImageIcon,
  Type,
  Navigation,
  Share2,
  Search,
  Code,
};

// ---------------------------------------------------------------------------
// EditorSidebar
// ---------------------------------------------------------------------------

export interface EditorSidebarProps {
  panels: Record<string, ReactNode>;
}

export function EditorSidebar({ panels }: EditorSidebarProps) {
  const { state, setActivePanel } = useEditor();
  const t = useTranslations('websiteEditor');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line -- mounted state pattern for Radix Accordion hydration fix
  }, []);

  return (
    <aside
      className={cn(
        'bg-neutral-900 border-r border-white/10 flex flex-col overflow-hidden transition-all duration-300 ease-in-out',
        state.isSidebarCollapsed ? 'w-0 border-r-0' : 'w-[320px]',
      )}
    >
      <div
        className={cn(
          'flex-1 overflow-auto',
          state.isSidebarCollapsed && 'hidden',
        )}
      >
        {mounted ? (
          <Accordion
            type="single"
            collapsible
            value={state.activePanel}
            onValueChange={(value) => {
              if (value) {
                setActivePanel(value as EditorPanel);
              }
            }}
          >
            {PANEL_CONFIG.map((panel) => {
              const Icon = ICON_MAP[panel.icon];
              return (
                <AccordionItem key={panel.id} value={panel.id}>
                  <AccordionTrigger className="hover:bg-white/5">
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4 text-rink-500" />}
                      {t(`sidebarPanels.${panel.id}`)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {panels[panel.id] ?? (
                      <p className="text-neutral-500 text-xs">
                        {t('noPanelContent')}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="p-4 space-y-2">
            {PANEL_CONFIG.map((panel) => (
              <div key={panel.id} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
