import { useTranslation } from "react-i18next";

interface BackToMenuButtonProps {
	onClick: () => void;
}

export default function BackToMenuButton({ onClick }: BackToMenuButtonProps) {
	const { t } = useTranslation();
	return (
		<button
			onClick={onClick}
			className="px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
			aria-label={t("bombParty.backToMenu")}
		>
			{t("bombParty.backToMenu")}
		</button>
	);
}
