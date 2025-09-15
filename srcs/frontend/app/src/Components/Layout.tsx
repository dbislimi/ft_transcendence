import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import BackgroundSurface from "./BackgroundSurface";

export default function Layout() {
	const location = useLocation();
	const isGameRoute = location.pathname.startsWith('/game');
	const isBombPartyRoute = location.pathname.startsWith('/bomb-party');

	return (
		<>
			<Header />
			<BackgroundSurface>
				<main className="min-h-screen">
					<Outlet />
				</main>
			</BackgroundSurface>
		</>
	)
}