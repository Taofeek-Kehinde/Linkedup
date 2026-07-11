"use client";

import { useEffect, useState } from "react";

export default function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {

    const handleBeforeInstallPrompt = (event: any) => {

      // Stop the browser from showing automatically
      event.preventDefault();

      // Save the event
      setInstallPrompt(event);

      // Show our button
      setShowButton(true);

    };


    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );


    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };

  }, []);


  async function installApp() {

    if (!installPrompt) return;


    // Show browser install popup
    installPrompt.prompt();


    const result = await installPrompt.userChoice;


    if (result.outcome === "accepted") {
      console.log("User installed LinkedUp");
    } else {
      console.log("User cancelled installation");
    }


    setInstallPrompt(null);
    setShowButton(false);

  }


  if (!showButton) {
    return null;
  }


  return (
    <button
      onClick={installApp}
      className="
        fixed
        bottom-5
        right-5
        bg-black
        text-white
        px-5
        py-3
        rounded-full
        shadow-lg
        z-50
      "
    >
      📱 Install LinkedUp
    </button>
  );
}