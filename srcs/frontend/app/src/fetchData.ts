export default async function fetchData(){
	try {
		const response: Response = await fetch('http://localhost:3000');
		const infos: any = await response.json();
		return (infos);
	} catch (error) {
		console.log("Error:" + error);
	}
}