import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import BackgroundSurface from "./BackgroundSurface";
import ChatWidget from "./ChatWidget";

export default function Layout() {
	const location = useLocation();
	const isGameRoute = location.pathname.startsWith('/pong');
	const isBombPartyRoute = location.pathname.startsWith('/bomb-party');

	return (
		<>
			<Header />
			<BackgroundSurface>
				<main className="h-full">
					<Outlet />
				</main>
				<ChatWidget />
			</BackgroundSurface>
		</>
	)
}
