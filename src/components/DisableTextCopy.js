'use client';

import { useEffect } from 'react';

function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-allow-copy="true"]')) return true;
  const el = target.closest('input, textarea, select, [contenteditable="true"]');
  if (!el) return false;
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    if (['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden', 'image', 'range', 'color'].includes(type)) {
      return false;
    }
  }
  return true;
}

/**
 * Blocks casual text copying across the app.
 * Form fields remain usable; mark exceptions with data-allow-copy="true".
 */
export function DisableTextCopy() {
  useEffect(() => {
    function onCopy(e) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onCut(e) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onContextMenu(e) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onSelectStart(e) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onDragStart(e) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onKeyDown(e) {
      if (isEditableTarget(e.target)) return;
      const key = String(e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (key === 'c' || key === 'x' || key === 'a' || key === 's' || key === 'p' || key === 'u') {
        e.preventDefault();
      }
    }

    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCut, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('selectstart', onSelectStart, true);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCut, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('selectstart', onSelectStart, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  return null;
}
