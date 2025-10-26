import { Children, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import * as pages from "./pages";
import Layout from "./Components/Layout";
import { BackgroundProvider } from "./contexts/BackgroundContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./Components/ProtectedRoute";

const router = createBrowserRouter([
	{
		element: <Layout />,
		children: [
			{
				element: <ProtectedRoute />,
				children: [
					{ path: "/pong", element: <pages.Pong /> },
					{ path: "/bomb-party", element: <pages.BombParty /> },
					{ path: "/settings", element: <pages.Settings /> },
					{ path: "/profile", element: <pages.Profile /> },
					{ path: "/friends", element: <pages.Friends /> },
				],
			},
			{ path: "/", element: <pages.Home /> },
			{ path: "/Connection", element: <pages.Connection /> },
			{ path: "/Confirmation", element: <pages.Confirmation /> },
			{ path: "/Registration", element: <pages.Registration /> },
			{ path: "/about", element: <pages.About /> },
			{ path: "/auth", element: <pages.auth /> },
			{ path: "/Reglages", element: <pages.Reglages /> },
			// { path: "/chat", element: <pages.chat /> },
			{ path: "*", element: <pages.NotFoundPage /> },
		],
	},
]);

createRoot(document.getElementById("root")!).render(
	// <StrictMode>
	<BackgroundProvider>
		<UserProvider>
			<WebSocketProvider>
				<RouterProvider router={router} />
			</WebSocketProvider>
		</UserProvider>
	</BackgroundProvider>
	// </StrictMode>
);
