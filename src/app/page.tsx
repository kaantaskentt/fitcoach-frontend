"use client";

import { useState, useEffect } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { WelcomePage } from "@/components/welcome/WelcomePage";

const WELCOME_SEEN_KEY = "fitcoach_welcome_seen";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [appVisible, setAppVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const seen = localStorage.getItem(WELCOME_SEEN_KEY);
      if (seen) {
        setAppVisible(true);
      } else {
        setShowWelcome(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleEnter = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, "true");
    setShowWelcome(false);
    setAppVisible(true);
  };

  return (
    <>
      {showWelcome && <WelcomePage onEnter={handleEnter} />}
      {appVisible && (
        <div className="animate-app-enter">
          <ChatLayout />
        </div>
      )}
    </>
  );
}
