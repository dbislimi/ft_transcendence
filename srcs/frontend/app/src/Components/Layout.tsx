import { Outlet, useLocation } from "react-router";
import Header from "./Header";
// import ChatWidget from "./Chat";
import BackgroundSurface from "./BackgroundSurface";
import ChatWidget from "./ChatWidget";
import Notifications from "./Notifications";

export default function Layout() {
	return (
		<>
			<BackgroundSurface />
			<Header />
			<main className="w-full h-full">
				<Outlet />
			</main>
			<ChatWidget />
			<Notifications />
		</>
	);
}
