import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

export type NotificationVariant =
	| "default"
	| "info"
	| "success"
	| "warning"
	| "error";

export type NotificationAction = {
	label: string;
	primary?: boolean;
	onPress?: () => void;
	type?: "accept" | "decline";
};

export type NotificationItem = {
	id: string;
	title?: string;
	message: string;
	variant?: NotificationVariant;
	duration?: number;
	actions?: NotificationAction[];
};

type CreateNotificationInput = Omit<NotificationItem, "id">;

type NotificationContextType = {
	notifications: NotificationItem[];
	notify: (input: CreateNotificationInput) => string;
	dismiss: (id: string) => void;
	clear: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);

	const dismiss = useCallback((id: string) => {
		setNotifications((prev) => prev.filter((n) => n.id !== id));
	}, []);

	const notify = useCallback((input: CreateNotificationInput) => {
		const id = uid();
		const item: NotificationItem = {
			id,
			variant: "default",
			duration: 6000,
			...input,
		};
		setNotifications((prev) => [item, ...prev]);
		return id;
	}, []);

	const clear = useCallback(() => setNotifications([]), []);

	const value = useMemo(
		() => ({ notifications, notify, dismiss, clear }),
		[notifications, notify, dismiss, clear]
	);

	return (
		<NotificationContext.Provider value={value}>
			{children}
		</NotificationContext.Provider>
	);
};

export function useNotifications() {
	const ctx = useContext(NotificationContext);
	if (!ctx)
		throw new Error(
			"useNotifications must be used within NotificationProvider"
		);
	return ctx;
}
