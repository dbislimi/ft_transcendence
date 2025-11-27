import { useUser } from "../context/UserContext";
import { Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

export default function ProtectedRoute() {
	const { user, isLoading } = useUser();
	
	console.log("Protected Route, redirection ...");
	console.log(`isLoading: ${isLoading}, user: ${user?.name}`)
	if (isLoading) {
		console.log("LOADING");
		return (
			<div className="p-8 text-center text-lg text-slate-400">
				Chargement...
			</div>
		);
	}
	if (!user) return <Navigate to="/Connection" replace />;
	console.log("Protected route passed");
	return <Outlet />;
}
