import { useCallback, useEffect, useRef, useState } from "react";
import { parentProgressDemo } from "../data/parentProgressDemo";
import { ApiError } from "../services/apiClient";
import { ParentProgressDataError, parentProgressService } from "../services/parentProgressService";
import type { ParentLearningProgress, ParentLinkedChild } from "../types/parentProgress";

export type ParentProgressMode = "live" | "demo";
export type ParentProgressStatus = "loading" | "ready" | "unlinked" | "denied" | "unavailable" | "error";

interface ParentProgressState {
  status: ParentProgressStatus;
  children: ParentLinkedChild[];
  selectedChildId: string | null;
  progress: ParentLearningProgress | null;
}

function emptyState(status: ParentProgressStatus): ParentProgressState {
  return { status, children: [], selectedChildId: null, progress: null };
}

function failureStatus(error: unknown): ParentProgressStatus {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "denied";
    if (error.status === 404 || error.status >= 500) return "unavailable";
  }
  if (error instanceof ParentProgressDataError) return "error";
  return error instanceof TypeError ? "unavailable" : "error";
}

export function useParentProgress() {
  const [mode, setMode] = useState<ParentProgressMode>("live");
  const [state, setState] = useState<ParentProgressState>(() => emptyState("loading"));
  const [revision, setRevision] = useState(0);
  const preferredChildId = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const cancelRequest = useCallback(() => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
  }, []);

  const refresh = useCallback(() => {
    cancelRequest();
    setState(emptyState("loading"));
    setRevision(requestVersion.current);
  }, [cancelRequest]);

  const selectChild = useCallback(
    (childId: string) => {
      cancelRequest();
      if (!state.children.some((child) => child.id === childId)) {
        preferredChildId.current = null;
        setState(emptyState("denied"));
        return;
      }
      preferredChildId.current = childId;
      setState(emptyState("loading"));
      setRevision(requestVersion.current);
    },
    [cancelRequest, state.children],
  );

  const changeMode = useCallback(
    (nextMode: ParentProgressMode) => {
      cancelRequest();
      preferredChildId.current = null;
      setState(emptyState("loading"));
      setMode(nextMode);
      setRevision(requestVersion.current);
    },
    [cancelRequest],
  );

  useEffect(() => {
    const controller = new AbortController();
    const version = revision;
    activeRequest.current = controller;
    const service = mode === "demo" ? parentProgressDemo : parentProgressService;
    const isCurrent = () => !controller.signal.aborted && version === requestVersion.current;

    async function load() {
      try {
        const children = await service.listChildren(controller.signal);
        if (!isCurrent()) return;
        if (!children.length) {
          preferredChildId.current = null;
          setState(emptyState("unlinked"));
          return;
        }
        const requestedId = preferredChildId.current;
        const selectedChild = requestedId ? children.find((child) => child.id === requestedId) : children[0];
        if (!selectedChild) {
          preferredChildId.current = null;
          setState(emptyState("denied"));
          return;
        }
        preferredChildId.current = selectedChild.id;
        setState({ status: "loading", children, selectedChildId: selectedChild.id, progress: null });
        const progress = await service.getProgress(selectedChild.id, controller.signal);
        if (!isCurrent()) return;
        setState({ status: "ready", children, selectedChildId: selectedChild.id, progress });
      } catch (error) {
        if (!isCurrent()) return;
        preferredChildId.current = null;
        setState(emptyState(failureStatus(error)));
      }
    }

    void load();
    return () => {
      controller.abort();
    };
  }, [mode, revision]);

  useEffect(() => {
    const recheckVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", recheckVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", recheckVisible);
    };
  }, [refresh]);

  return {
    ...state,
    mode,
    selectChild,
    refresh,
    startDemo: () => changeMode("demo"),
    exitDemo: () => changeMode("live"),
  };
}
