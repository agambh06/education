import { useRegisterSW } from "virtual:pwa-register/react";
import { Alert, Button, Stack } from "@mantine/core";
import { useNetwork } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { pwaStrings } from "./strings";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function PwaStatus() {
  const { online } = useNetwork();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registeredWorker) {
      setRegistration(registeredWorker);
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
  });

  useEffect(() => {
    if (!registration) return;

    const checkForUpdate = () => {
      if (navigator.onLine && document.visibilityState === "visible") {
        if (registration.waiting) setNeedRefresh(true);

        void registration.update().catch((error: unknown) => {
          console.warn("Service worker update check failed", error);
        });
      }
    };

    const interval = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("online", checkForUpdate);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
    };
  }, [registration, setNeedRefresh]);

  if (online && !needRefresh) return null;

  return (
    <Stack gap="sm" mb="md" aria-live="polite">
      {!online && (
        <Alert color="yellow" title={pwaStrings.offlineTitle} role="status">
          {pwaStrings.offlineMessage}
        </Alert>
      )}
      {needRefresh && (
        <Alert
          color="indigo"
          title={pwaStrings.updateTitle}
          withCloseButton
          closeButtonLabel={pwaStrings.dismissUpdate}
          onClose={() => setNeedRefresh(false)}
          role="status"
        >
          {pwaStrings.updateMessage}
          <Button
            mt="sm"
            size="sm"
            disabled={!online}
            onClick={() => {
              void updateServiceWorker(true).catch((error: unknown) => {
                console.error("Service worker update failed", error);
              });
            }}
          >
            {pwaStrings.updateAction}
          </Button>
        </Alert>
      )}
    </Stack>
  );
}
