import { Link } from "react-router"
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Home() {
	const navigate = useNavigate();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get("token");
		const require2fa = params.get("require2fa");

		if (token) {
			localStorage.setItem("token", token);
			const cleanUrl = window.location.origin + window.location.pathname;
			window.history.replaceState({}, document.title, cleanUrl);
			navigate("/dashboard");
		}
		else if (require2fa == '1'){
			const cleanUrl = window.location.origin + window.location.pathname;
			window.history.replaceState({}, document.title, cleanUrl);
			navigate("/auth");
		}
	}, []);

	return (
		<div className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
			<Link to={"/Connection"}>
				<button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Connect</button>
			</Link>
			<br />
			<Link to={"/Registration"}>
				<button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Registration</button>
			</Link>
			<br />
			<Link to={"/game"}>
				<button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Game</button>
			</Link>
			<br />
			<a href="http://localhost:3000/auth/google">
				<button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Google</button>
			</a>
		</div>
	)
}

//faire un components qui recupere le token renvoyer par google et le stock localstorage