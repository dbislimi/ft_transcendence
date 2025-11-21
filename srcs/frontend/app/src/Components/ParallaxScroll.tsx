import { useEffect, useRef } from "react";

export default function ParallaxScroll() {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!parallaxRef.current) return;
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.3;
      parallaxRef.current.style.transform = `translateY(${rate}px)`;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative overflow-hidden pointer-events-none">
      <div
        ref={parallaxRef}
        className="absolute inset-0 pointer-events-none"
        style={{ willChange: 'transform' }}
      >
        <div className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-60 blur-sm"></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-gradient-to-br from-green-400 to-blue-600 rounded-full opacity-40 blur-sm"></div>
        <div className="absolute top-80 left-1/4 w-20 h-20 bg-gradient-to-br from-red-400 to-pink-600 rounded-full opacity-30 blur-sm"></div>
        
        <div className="absolute top-32 right-1/3 w-2 h-2 bg-yellow-300 rounded-full opacity-80"></div>
        <div className="absolute top-64 left-1/3 w-1 h-1 bg-white rounded-full opacity-60"></div>
        <div className="absolute top-96 right-1/4 w-3 h-3 bg-cyan-300 rounded-full opacity-50"></div>
      </div>
    </div>
  );
}