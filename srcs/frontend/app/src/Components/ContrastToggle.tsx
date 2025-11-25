import { useState, useEffect } from "react";

export default function ContrastToggle() {
  const [contrast, setContrast] = useState("normal");

  const contrastLevels = {
    normal: "contrast-100",
    high: "contrast-150",
    veryHigh: "contrast-200"
  };

  useEffect(() => {
    const savedContrast = localStorage.getItem("contrast");
    if (savedContrast) {
      setContrast(savedContrast);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    Object.values(contrastLevels).forEach(level => {
      root.classList.remove(level);
    });
    if (contrast !== "normal") {
      root.classList.add(contrastLevels[contrast as keyof typeof contrastLevels]);
    }
    localStorage.setItem("contrast", contrast);
  }, [contrast]);

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-300">Contraste:</span>
      <select
        value={contrast}
        onChange={(e) => setContrast(e.target.value)}
        className="px-3 py-1 bg-slate-800 border border-purple-500/30 rounded-md text-sm text-white"
      >
        <option value="normal">Normal</option>
        <option value="high">Élevé</option>
        <option value="veryHigh">Très élevé</option>
      </select>
    </div>
  );
}