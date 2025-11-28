import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
	const { t } = useTranslation();
	
	return (
		<div className="bg-black min-h-screen flex flex-col items-center justify-center">
			<h1 className="text-white text-6xl font-bold mb-8">{t('notFound.title')}</h1>
			<p className="text-white text-xl mb-8">{t('notFound.message')}</p>
			<Link to={"/"}>
				<button type="button" className="bg-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
					{t('notFound.goHome')}
				</button>
			</Link>
		</div>
	);
}
