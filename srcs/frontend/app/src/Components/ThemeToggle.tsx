// mode light / dark button
import React from "react";

import { useSettings } from "../contexts/SettingsContext";
export default function ThemeToggle() {
  const { settings, updateDisplaySettings } = useSettings();
  const isDark = settings.display.theme === 'dark';

  const toggleTheme = () => {
    updateDisplaySettings({ 
      theme: isDark ? 'light' : 'dark' 
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-3 rounded-xl transition-all duration-500 transform hover:scale-110 ${
        isDark 
          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50' 
          : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50'
      }`}
      aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
    >
      {isDark ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}