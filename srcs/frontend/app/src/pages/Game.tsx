import { useEffect, useRef, useState } from "react";

function useWebsocket(onMessage: (event: MessageEvent) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:3000/ws/game");
    ws.current.onopen = () => console.log("ws opened");
    ws.current.onclose = () => console.log("ws closed");
    ws.current.onmessage = onMessage;
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [onMessage]);
  return ws.current;
}

export default function Game() {
  const [ballx, setBallx] = useState(0);
  const [bally, setBally] = useState(0);
  const [state, setState] = useState(false);

  const ws = useWebsocket((event) => {
    const message = JSON.parse(event.data);
    console.log(message);
    setBallx(message.x * 4);
    setBally(message.y * 4);
  });

  const handleButton = () => {
    setState(!state);
    if (!state) ws?.send("start");
    else ws?.send("stop");
  };

  return (
    <>
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="relative h-100 w-200 border-5 flex flex-col items-center justify-center">
          {!state ? (
            <button
              onClick={handleButton}
              type="button"
              className="z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
            >
              PLAY
            </button>
          ) : (
            <button
              onClick={handleButton}
              type="button"
              className="z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
            >
              STOP
            </button>
          )}
          <div
            className="absolute size-3 bg-red-700 rounded-full"
            style={{
              top: `${bally}px`,
              left: `${ballx}px`,
            }}
          ></div>
        </div>
      </div>
    </>
  );
}
