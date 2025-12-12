import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from "../contexts/UserContext";
import { API_BASE_URL } from "../config/api";
import { useTranslation } from "react-i18next";

export default function EnterCode() {
	const [code, setCode] = useState('');
	const [error, setError] = useState('');
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { setToken } = useUser();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		try {
			const userId = sessionStorage.getItem('for2FaUserId');
			const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
			const response = await fetch(`${API_BASE_URL}/api/check2fa`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ code, userId }),
			});

			const data = await response.json();

			if (response.ok) {
				setToken(data.token);
				navigate('/');
			} else {
				setError(data.error || t('auth.invalidCode'));
			}
		} catch (err) {
			setError(t('errors.network'));
		}
	};

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
			<div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
				<h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
					{t("auth.enterCode") || "Entrez le code reçu par mail"}
				</h2>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<input
							type="text"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder={t("auth.yourCode") || "Code de vérification"}
							className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white placeholder-slate-400 transition-all"
						/>
					</div>
					{error && (
						<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
							{error}
						</div>
					)}
					<button
						type="submit"
						className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-300 transform hover:scale-[1.02]"
					>
						{t("auth.verify") || "Vérifier le code"}
					</button>
				</form>
			</div>
		</div>
	);
}
