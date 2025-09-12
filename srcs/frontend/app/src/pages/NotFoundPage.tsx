import { Link } from "react-router-dom";

export default function NotFoundPage() {
	return (
		<>
			<body className="bg-black">
				<h1 className="flex text-white ">404</h1>
				<Link to={"/"}>
					<button type="button" className="bg-white">Go back home</button>
				</Link>
			</body>
		</>
	);
}
