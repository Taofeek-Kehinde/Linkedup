"use client";

import { useEffect } from "react";

export default function RegisterSW() {

  useEffect(() => {

    if ("serviceWorker" in navigator) {

      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
        return;
      }

      navigator.serviceWorker.register("/sw.js")
        .then(() => {
          console.log("Service Worker registered");
        })
        .catch((error) => {
          console.log("Service Worker failed:", error);
        });

    }

  }, []);


  return null;
}