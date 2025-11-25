import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
// import ChatWidget from "./Chat";
import BackgroundSurface from "./BackgroundSurface";
import Notifications from "./Notifications";

export default function Layout() {
	return (
		<>
			<Header />
			<BackgroundSurface>
				<main className="h-full">
					<Outlet />
				</main>
			</BackgroundSurface>
			<Notifications />
		</>
	);
}
