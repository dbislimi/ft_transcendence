import { Link } from "react-router";

export default function NotFoundPage() {
	return (
		<>
			<body className="bg-black">
				<h1 className="flex text-white ">404</h1>
				<Link to={"/"}>
					<button>Go back home</button>
				</Link>
			</body>
		</>
	);
}
