import { useState, useEffect } from "react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme)
        setIsDark(savedTheme === "dark");
    }, []);

    useEffect(() => {
    // Appliquer le thème
    if (isDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
    }
    else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
    }
    }, [isDark]);

    const toggleTheme = () => {
    setIsDark(!isDark);
    };

    return (
    <button
        onClick={toggleTheme}
        className="relative inline-flex h-10 w-20 items-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 p-1 transition-all duration-300 hover:scale-105"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
        <div
        className={`h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
            isDark ? "translate-x-10" : "translate-x-0"
        }`}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2">
        <span className="text-white text-xs">☀️</span>
        <span className="text-white text-xs">🌙</span>
        </div>
    </button>
    );
}