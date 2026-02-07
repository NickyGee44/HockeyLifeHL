'use client';

import { useEffect } from 'react';
import { useEditor } from '../EditorContext';

export function useUnsavedChanges() {
  const { hasUnsavedChanges } = useEditor();

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges()) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
