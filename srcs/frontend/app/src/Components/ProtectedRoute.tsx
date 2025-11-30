import { useUser } from "../contexts/UserContext";
import { Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute() {
	const { user, isLoading, isAuthenticated } = useUser();
	const { t } = useTranslation();

	console.log("Protected Route, redirection ...");
	console.log(`isLoading: ${isLoading}, user: ${user?.name}`);
	if (isLoading) {
		console.log("LOADING");
		return (
			<div className="p-8 text-center text-lg text-slate-400">
				{t("common.loading")}
			</div>
		);
	}
	if (!isAuthenticated) return <Navigate to="/Connection" replace />;
	console.log("Protected route passed");
	return <Outlet />;
}
