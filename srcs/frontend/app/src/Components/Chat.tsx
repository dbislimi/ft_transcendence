import { useState } from "react";

export default function Chat() {
	const [state, setState] = useState(false);

	return (
		<>
			<button type="button" onClick={() => setState(!state)} className="absolute bottom-0 left-0 size-10 border shadow-amber-600 rounded-2xl"></button>
			{state && <div className=" w-1/4 h-100 overflow-auto border">
				</div>}
		</>
	);
}