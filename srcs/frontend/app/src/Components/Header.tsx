import { Link } from "react-router";
import Logo from "../assets/logo.png";

export default function Header() {
	return (
		<header className="w-full bg-white px-4 shadow flex justify-between items-center">
				<Link to="/Registration">Sign in</Link>
				<Link to={"/"} className="size-20">
					<img src={Logo} className="size-full hover:scale-125 object-contain transition-transform duration-300"/>
				</Link>
				<Link to="/reglages" className="text-black-500 hover:underline">
				reglages
				</Link>
		</header>
	);
}
