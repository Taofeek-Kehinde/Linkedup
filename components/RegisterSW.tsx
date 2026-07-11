"use client";

import { useEffect } from "react";

export default function RegisterSW() {

  useEffect(() => {

    if ("serviceWorker" in navigator) {

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