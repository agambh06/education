// Service-worker registration requires a browser. The app and PWA status component
// still render normally; worker lifecycle behavior has its own regression suite.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined] as const,
    updateServiceWorker: async () => undefined,
  };
}
