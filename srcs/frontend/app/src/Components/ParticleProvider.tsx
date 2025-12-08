import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  type: 'star' | 'nebula' | 'cosmic';
}

export default function ParticleProvider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const location = useLocation();
  const shouldShowParticles = !location.pathname.includes('/game') && 
                             !location.pathname.includes('/Connection') && 
                             !location.pathname.includes('/Registration');

  useEffect(() => {
    if (!shouldShowParticles) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 40; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          size: Math.random() * 1.2 + 0.3,
          color: `hsl(${200 + Math.random() * 40}, 60%, 70%)`,
          opacity: 0.3 + Math.random() * 0.4,
          type: 'star'
        });
      }
      for (let i = 0; i < 15; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.05,
          vy: (Math.random() - 0.5) * 0.05,
          size: Math.random() * 3 + 2,
          color: `hsl(${250 + Math.random() * 60}, 40%, 50%)`,
          opacity: 0.1 + Math.random() * 0.15,
          type: 'nebula'
        });
      }
      for (let i = 0; i < 25; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
          size: Math.random() * 1.8 + 0.8,
          color: `hsl(${180 + Math.random() * 80}, 50%, 60%)`,
          opacity: 0.2 + Math.random() * 0.3,
          type: 'cosmic'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleClick = () => {
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          vx: (Math.random() - 0.5) * 3.0,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 2 + 1,
          color: `hsl(${Math.random() * 360}, 50%, 60%)`,
          opacity: 0.5,
          type: 'cosmic'
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(255, 0, 0, 0)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -0.8;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -0.8;
        
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 10) { 
          const force = (10 - distance) / 10;
          particle.vx += (dx / distance) * force * 0.01;
          particle.vy += (dy / distance) * force * 0.01;          
          particle.size = Math.min(particle.size + 0.02, particle.type === 'nebula' ? 5 : 2.5);
          particle.opacity = Math.min(particle.opacity + 0.002, 0.8);
        } else {
          particle.size = Math.max(particle.size - 0.01, particle.type === 'nebula' ? 2 : 0.3);
          particle.opacity = Math.max(particle.opacity - 0.001, 0.1);
        }
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        
        if (particle.type === 'nebula') {
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          );
          gradient.addColorStop(0, particle.color);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          
          if (particle.type === 'star') {
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 2;
            ctx.fill();
          }
        }
        ctx.restore();
        if (particle.size < 0.2 || (Math.abs(particle.vx) > 2 && Math.abs(particle.vy) > 2)) {
          particlesRef.current.splice(index, 1);
        }
      });

      frameIdRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    resize();
    animate();
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, [shouldShowParticles]);

  if (!shouldShowParticles) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}
