"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

export default function InstallApp() {

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);


  useEffect(() => {

    const isIOSDevice =
      /iphone|ipad|ipod/i.test(
        navigator.userAgent
      );


    const isStandalone =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      (navigator as any).standalone === true;


    // Already installed
    if (isStandalone) {
      return;
    }


    setIsIOS(isIOSDevice);


    // Android / Chrome / Edge
    window.addEventListener(
      "beforeinstallprompt",
      (event: any) => {

        event.preventDefault();

        setInstallPrompt(event);

        setShowButton(true);

      }
    );


    // iPhone / iPad Safari
    if (isIOSDevice) {

      setShowButton(true);

    }


  }, []);



  async function installApp() {


    // iPhone / iPad
    if (isIOS) {

      alert(
        "Install LinkedUp:\n\n" +
        "1. Tap Share button\n" +
        "2. Select Add to Home Screen\n" +
        "3. Tap Add"
      );

      return;

    }



    // Android/Desktop
    if (!installPrompt) {
      return;
    }


    installPrompt.prompt();


    const result =
      await installPrompt.userChoice;


    if (result.outcome === "accepted") {

      console.log(
        "LinkedUp installed"
      );

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
  flex
  items-center
  gap-2
  "
>
  <Download size={20} />

  Install LinkedUp
</button>
  );

}