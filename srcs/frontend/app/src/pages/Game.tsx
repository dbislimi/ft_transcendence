import { useEffect } from "react";

export default function Game(){
	useEffect(() => {
		const fetchData = async () => {
			const response: Response = await fetch("http://localhost:3000/game")
			const data = await response.json();
			console.log(data);
		};
		fetchData();
	}, [])
	
	return (
		<>
		
		</>
	)
}