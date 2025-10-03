import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import * as pages from "./pages";
import { UserProvider, useUser } from "./context/UserContext";
import type { ReactNode } from "react";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, token } = useUser();

  if (!token) return <Navigate to="/connection" replace />;
  if (!user) return <div className="p-6 text-center">Chargement...</div>;

  return <>{children}</>;
}

const router = createBrowserRouter([
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
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  </StrictMode>
);
