"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureProject } from "./project";
import { STORAGE_EVENT, getProject, saveProject } from "./store";
import type { Project } from "./types";

// The studio's single source of truth for one project: loads it, keeps it in memory, saves
// it shortly after each change (not on every keystroke) and keeps an undo and redo trail.

const SAVE_DELAY = 350; // ms of quiet before writing to storage
const UNDO_GAP = 900; // changes closer together than this undo as one
const UNDO_LIMIT = 60;

export type SaveState = "saved" | "saving" | "failed";

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [, bump] = useState(0);
  const live = useRef<Project | null>(null);
  const undoStack = useRef<Project[]>([]);
  const redoStack = useRef<Project[]>([]);
  const lastPush = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current || !live.current) return;
    dirty.current = false;
    saveProject(live.current);
    setSaveState((s) => (s === "failed" ? s : "saved"));
  }, []);

  const commit = useCallback(
    (next: Project) => {
      live.current = next;
      setProject(next);
      dirty.current = true;
      setSaveState((s) => (s === "failed" ? s : "saving"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY);
    },
    [flush]
  );

  useEffect(() => {
    const found = getProject(id);
    const ready = found ? ensureProject(found) : null;
    live.current = ready;
    undoStack.current = [];
    redoStack.current = [];
    setProject(ready);
    setLoaded(true);
    if (ready && ready !== found) saveProject(ready);
    const onStorage = (e: Event) => setSaveState((e as CustomEvent<{ ok: boolean }>).detail.ok ? "saved" : "failed");
    const onHide = () => flush();
    window.addEventListener(STORAGE_EVENT, onStorage);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener(STORAGE_EVENT, onStorage);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [id, flush]);

  // `quiet` changes (marking a panel as seen, for example) are saved but not undoable.
  const update = useCallback(
    (fn: (prev: Project) => Project, quiet = false) => {
      const prev = live.current;
      if (!prev) return;
      const next = fn(prev);
      if (next === prev) return;
      if (!quiet) {
        const now = Date.now();
        if (now - lastPush.current > UNDO_GAP) {
          undoStack.current.push(prev);
          if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
        }
        lastPush.current = now;
        redoStack.current = [];
      }
      commit(next);
    },
    [commit]
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev || !live.current) return;
    redoStack.current.push(live.current);
    lastPush.current = 0;
    commit(prev);
    bump((n) => n + 1);
  }, [commit]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next || !live.current) return;
    undoStack.current.push(live.current);
    lastPush.current = 0;
    commit(next);
    bump((n) => n + 1);
  }, [commit]);

  return { project, loaded, update, undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0, saveState, flush };
}
