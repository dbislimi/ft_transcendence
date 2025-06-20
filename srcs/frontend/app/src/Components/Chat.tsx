import { useState, useRef } from "react";

export default function Chat() {
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<string[]>([]);
	const [input, setInput] = useState("");
	const showRef = useRef<ReturnType<typeof setTimeout>>(null);

	const handleSend = () => {
		if (input === "") return;
		if (showRef.current) clearTimeout(showRef.current);
		setMessages(prev => [...prev, input]);
		setInput("")
		setIsOpen(true);
		showRef.current = setTimeout(() => setIsOpen(false), 4000)
	}

	return (
		<div className="fixed bottom-4 right-4 w-full max-w-md"	>
				{isOpen && 
				(<div className="mb-2 max-h-64 overflow-y-auto rounded-xl border p-4 shadow-lg">

					{messages.map((msg, i) => (
						<div key={i} className="mb-1 text-sm text-gray-800">{msg}</div>
					))}
				</div>)}
			<div className="flex items-center gap-2 border rounded-xl px-3 py-2 shadow-md">
				<input
					type="text"
					placeholder="Type here ..."
					value={input}
					onChange={e => setInput(e.target.value)}
					onKeyDown={e => {if (e.key === 'Enter') handleSend();}}
					className="flex-1 outline-none"
				></input>
				<button
					type="button"
					onClick={handleSend}
					className="rounded-md bg-blue-500 px-6 py-1 text-white hover:bg-blue-600"
				>Enter</button>
		</div>
		</div>
	);
}
