import { Outlet, useLocation } from "react-router";
import Header from "./Header";
// import ChatWidget from "./Chat";
import BackgroundSurface from "./BackgroundSurface";
import ChatWidget from "./ChatWidget";
import Notifications from "./Notifications";

export default function Layout() {
	return (
		<>
			<Header />
			<BackgroundSurface>
				<main className="h-full">
					<Outlet />
				</main>
				<ChatWidget />
			</BackgroundSurface>
			<Notifications />
		</>
	)
}
