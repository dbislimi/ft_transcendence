import { Link } from "react-router-dom";

export default function NotFoundPage() {
	return (
		<div className="bg-black min-h-screen flex flex-col items-center justify-center">
			<h1 className="text-white text-6xl font-bold mb-8">404</h1>
			<p className="text-white text-xl mb-8">Page not found</p>
			<Link to={"/"}>
				<button type="button" className="bg-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
					Go back home
				</button>
			</Link>
		</div>
	);
}
