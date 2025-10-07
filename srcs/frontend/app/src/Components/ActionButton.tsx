import { Link } from "react-router-dom";

interface ActionButtonProps {
	to?: string;
	onClick?: () => void;
	color: string;
	icon: React.ReactNode;
	title: string;
	subtitle: string;
}

export default function ActionButton({
	to,
	onClick,
	color,
	icon,
	title,
	subtitle,
}: ActionButtonProps) {
	const base =
		"relative w-56 overflow-hidden rounded-xl flex flex-col justify-center bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50 cursor-pointer";
	const gradient = `absolute inset-0 bg-gradient-to-r from-${color}-500/0 via-${color}-500/5 to-${color}-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500`;
	const iconBg = `w-12 h-12 mx-auto mb-3 rounded-full bg-${color}-500/20 flex items-center justify-center group-hover:bg-${color}-500/30 transition-colors duration-300`;
	const titleClass =
		"text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-1";
	const subtitleClass =
		"text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 px-2";

	const content = (
		<div className={base}>
			<div className={gradient}></div>
			<div className="relative px-4 py-6 text-center">
				<div className={iconBg}>{icon}</div>
				<h3 className={titleClass}>{title}</h3>
				<p className={subtitleClass}>{subtitle}</p>
			</div>
		</div>
	);

	if (to)
		return (
			<Link to={to} className="group cursor-pointer">
				{content}
			</Link>
		);
	return (
		<button className="group cursor-pointer" onClick={onClick}>
			{content}
		</button>
	);
}
