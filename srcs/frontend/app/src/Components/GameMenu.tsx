import fetchData from "../fetchData";
import { useRef } from "react";

export default function GameMenu() {
	const inputRef = useRef<HTMLInputElement>(null);
	const handleClick = async () => {
		if (!inputRef.current) return ;
		console.log("fetch " + inputRef.current.value);
		const response = await fetchData<string | null>(inputRef.current.value);
		if (response === null) console.log("found");
		else console.log("pas found");
	}
	return (
		<>
			<div className="absolute flex flex-col space-y-2 items-center space-x-3 p-10 border border-white size-100 bg-black opacity-80">
				<div className="flex items-center space-x-2">
					<span className="text-white">Public</span>
					<label className="relative inline-flex items-center">
						<input type="checkbox" className="sr-only peer" />
						<div className="w-11 h-6 bg-gray-600 rounded-2xl transition-colors duration-300 peer-checked:bg-green-400" />
						<div className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition-transform bg-white peer-checked:translate-x-full" />
					</label>
				</div>
				<div className="flex items-center space-x-2">
					<button type="button" onClick={handleClick} className="text-white">Join</button>
					<input type="text" ref={inputRef} placeholder="Enter Game ID" className="border border-white text-white w-40 px-2"></input>
				</div>
			</div>
		</>
	);
}
