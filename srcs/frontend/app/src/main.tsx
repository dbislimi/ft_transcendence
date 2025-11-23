import { Children, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import * as pages from "./pages";
import Layout from "./Components/Layout";
import { BackgroundProvider } from "./contexts/BackgroundContext";
import { WebSocketProvider, FriendsProvider } from "./context/WebSocketContext";
import { UserProvider } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import { GameSessionProvider } from "./context/GameSessionContext";
import { GameSettingsProvider } from "./context/GameSettingsContext";
import ProtectedRoute from "./Components/ProtectedRoute";

const router = createBrowserRouter([
	{
		element: <Layout />,
		children: [
			{
				element: <ProtectedRoute />,
				children: [
					{ path: "/friends", element: <pages.Friends /> },
					{ path: "/profile", element: <pages.Profile /> },
				],
			},
			{ path: "/settings", element: <pages.Settings /> },
			{ path: "/pong", element: <pages.Pong /> },
			{ path: "/bomb-party", element: <pages.BombParty /> },
			{ path: "/", element: <pages.Home /> },
			{ path: "/Connection", element: <pages.Connection /> },
			{ path: "/Confirmation", element: <pages.Confirmation /> },
			{ path: "/Registration", element: <pages.Registration /> },
			{ path: "/about", element: <pages.About /> },
			{ path: "/auth", element: <pages.auth /> },
			{ path: "/Reglages", element: <pages.Reglages /> },
			{ path: "*", element: <pages.NotFoundPage /> },
		],
	},
]);

createRoot(document.getElementById("root")!).render(
	<BackgroundProvider>
		<UserProvider>
			<WebSocketProvider>
				<FriendsProvider>
					<NotificationProvider>
						<GameSessionProvider>
							<GameSettingsProvider>
								<RouterProvider router={router} />
							</GameSettingsProvider>
						</GameSessionProvider>
					</NotificationProvider>
				</FriendsProvider>
			</WebSocketProvider>
		</UserProvider>
	</BackgroundProvider>
);
