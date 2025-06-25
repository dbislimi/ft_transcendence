import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import * as pages from './pages';
import Dashboard from './pages/Dashboard';
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  { path: "/", element: <pages.Home /> },
  { path: "/Connection", element: <pages.Connection /> },
  { path: "/Registration", element: <pages.Registration /> },
  { path: "/Confirmation", element: <pages.Confirmation /> },
  { path: "/Dashboard", element: <Dashboard /> },
  { path: "*", element: <pages.NotFoundPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

