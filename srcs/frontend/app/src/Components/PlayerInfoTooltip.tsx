import React from "react";
import type { PlayerProfile } from "../types/playerProfiles";
import PlayerInfoCard from "./PlayerInfoCard";

interface PlayerInfoTooltipProps {
    profile: PlayerProfile | null;
    visible: boolean;
    x: number;
    y: number;
    onClose?: () => void;
}

export default function PlayerInfoTooltip({
    profile,
    visible,
    x,
    y,
    onClose,
}: PlayerInfoTooltipProps) {
    if (!visible || !profile)
        return null;
    return (
        <div
            className="absolute z-40"
            style={{
                left: x,
                top: y,
                transform: "translate(-50%, -100%)",
                pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <PlayerInfoCard profile={profile} />
            <button
                type="button"
                className="mt-2 w-full text-center text-xs text-slate-300 hover:text-white"
                onClick={onClose}
            >
                Close
            </button>
        </div>
    );
}