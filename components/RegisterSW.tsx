"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Unregister in development to avoid caching local changes
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
        return;
      }

      // Register the service worker
      navigator.serviceWorker.register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered");

          // Check for updates to the service worker file
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                // If a new worker is ready and waiting, force activation
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  if (confirm("A new version of LinkedUp is available! Reload to update?")) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log("Service Worker failed:", error);
        });

      // Listen for the controlling event to reload the page when the worker skips waiting
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
