import React from "react";
import type { PlayerProfile } from "../types/playerProfiles";

interface PlayerInfoCardProps {
    profile: PlayerProfile;
}

export default function PlayerInfoCard({ profile }: PlayerInfoCardProps) {
    const avatar = profile.avatarUrl && profile.avatarUrl.trim() !== "" ? profile.avatarUrl : "/vite.svg";
    const formatMs = (ms: number) => {
        const hours = Math.floor(ms / 3_600_600);
        const minutes = Math.floor((ms % 3_600_600) / 60_000);
        return `${hours}h ${minutes}m`; 
    };
	return (
		<div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-xl w-64">
			<div className="flex items-center gap-3">
				<img
					src={avatar}
					alt={profile.username}
					className="w-12 h-12 rounded-full object-cover border border-slate-600"
				/>
				<div>
					<div className="text-white font-semibold">{profile.username}</div>
					<div className="text-xs text-slate-400">
						{new Date(profile.createdAt).toLocaleDateString()}
					</div>
				</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2 text-sm">
				<div className="text-slate-400">Play time</div>
				<div className="text-slate-200">{formatMs(profile.totalPlayTimeMs)}</div>
				<div className="text-slate-400">Wins</div>
				<div className="text-green-300">{profile.stats.wins}</div>
				<div className="text-slate-400">Losses</div>
				<div className="text-red-300">{profile.stats.losses}</div>
			</div>
		</div>
	);
}