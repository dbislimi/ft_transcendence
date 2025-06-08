import { useEffect, useState } from "react";

export default function Game() {
//  useEffect(() => {
//    const fetchData = async () => {
//      const response: Response = await fetch("http://localhost:3000/game");
//      const data = await response.json();
//      console.log(data);
//    };
//    fetchData();
//  }, []);
	const [state, setState] = useState(false);
	const handleButton = () => {
    setState(!state);
  };

	let ballx = 100 * 4;
	let bally = 50 * 4;
  return (
    <>
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="relative h-100 w-200 border-5 flex flex-col items-center justify-center">
          {state || <button
		  	onClick={handleButton}
            type="button"
            className="z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
          >
            PLAY
          </button>}
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
