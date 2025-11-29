import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useUser();

    useEffect(() => {
        const token = searchParams.get("token");
        const require2fa = searchParams.get("require2fa");
        const userId = searchParams.get("userId");

        if (require2fa === "1" && userId) {
            sessionStorage.setItem("for2FaUserId", userId);
            navigate("/auth");
        } else if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userData = {
                    id: payload.id,
                    name: payload.name,
                    email: payload.email
                };
                user(userData, token);
                navigate("/");
            } catch (e) {
                console.error("Failed to decode token", e);
                navigate("/Connection");
            }
        } else {
            navigate("/Connection");
        }
    }, [searchParams, navigate, user]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
}