import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
			<h1 className="text-9xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
				404
			</h1>
			<p className="text-lg text-gray-400 max-w-md">
				{t("notFound.message")}
			</p>
			<Link to="/">
				<button
					type="button"
					className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
				>
					{t("notFound.goHome")}
				</button>
			</Link>
		</div>
	);
}
