import React, { useRef, useEffect } from "react";

interface Props {
  type: string;
}

export default function Form({ type }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xPos = useRef(10);
  const speed = useRef(2);
  const direction = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dessiner le carré bleu statique
      ctx.fillStyle = "blue";
      ctx.fillRect(10, 10, 100, 100);

      // Dessiner le cercle rouge animé
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(xPos.current, 100, 30, 0, Math.PI * 2);
      ctx.fill();

      // Mise à jour de la position
      xPos.current += speed.current * direction.current;
      if (xPos.current > canvas.width - 30 || xPos.current < 30) {
        direction.current *= -1; // Inverser la direction
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          {type}
        </h2>

        {/* Canvas avec animation */}
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          className="border-2 border-gray-800 mt-6 rounded-lg shadow-lg"
        ></canvas>
      </div>
    </div>
  );
}
