import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import * as pages from "./pages";
import Layout from "./Components/Layout";
//import { createBrowserRouter, RouterProvider } from "react-router";
import { WebSocketProvider } from "./context/WebSocketContext";
import { UserProvider, useUser } from "./context/UserContext";
//import type { ReactNode } from "react";

/*function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, token } = useUser();

  if (!token) return <Navigate to="/connection" replace />;
  if (!user) return <div className="p-6 text-center">Chargement...</div>;

  return <>{children}</>;
}*/

const router = createBrowserRouter([
	{
		element: <Layout />,
		children: [
			{ path: "/", element: <pages.Home /> },
			{ path: "/Connection", element: <pages.Connection /> },
			{ path: "/Confirmation", element: <pages.Confirmation /> },
			{ path: "/Registration", element: <pages.Registration /> },
			{ path: "/game", element: <pages.Game /> },
			{ path: "/auth", element: <pages.auth /> },
			{ path: "/Dashboard", element: <pages.Dashboard /> },
			{ path: "/Reglages", element: <pages.Reglages /> },
			{ path: "/chat", element: <pages.chat /> },
      { path: "/profile", element: <pages.Profile /> },
      { path: "/friends", element: <pages.Friends /> },
      { path: "*", element: <pages.NotFoundPage /> },
		],
	},
]);

/*const router = createBrowserRouter([
  {
    element: <pages.Layout />,
    children: [
      { path: "/", element: <pages.Home /> },
      { path: "/connection", element: <pages.Connection /> },
      { path: "/confirmation", element: <pages.Confirmation /> },
      { path: "/registration", element: <pages.Registration /> },
      { path: "/game", element: <pages.Game /> },
      {
        path: "/dashboard",
        element: (
          <PrivateRoute>
            <pages.Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <PrivateRoute>
            <pages.Profile />
          </PrivateRoute>
        ),
      },
      {
        path: "/friends",
        element: (
          <PrivateRoute>
            <pages.Friends />
          </PrivateRoute>
        ),
      },
      { path: "/auth", element: <pages.Auth /> },
      { path: "*", element: <pages.NotFoundPage /> },
    ],
  },
]);*/

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <WebSocketProvider>
        <RouterProvider router={router} />
      </WebSocketProvider>
    </UserProvider>
  </StrictMode>
);
