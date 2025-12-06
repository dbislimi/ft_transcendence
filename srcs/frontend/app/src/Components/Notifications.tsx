import React from "react";
import NotificationsContainer from "./NotificationsContainer";
import RealtimeNotifications from "./RealtimeNotifications";
import BombPartyRealtimeNotifications from "./BombPartyRealtimeNotifications";

export default function Notifications() {
	return (
		<>
			<NotificationsContainer />
			<RealtimeNotifications />
			<BombPartyRealtimeNotifications />
		</>
	);
}
