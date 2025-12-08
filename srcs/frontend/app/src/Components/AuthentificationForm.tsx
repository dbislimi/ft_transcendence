import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationContext";
import { API_BASE_URL } from "../config/api";

interface UserInfos {
	name: string;
	email: string;
	password: string;
}

interface Props {
	type: string;
}

export default function Form({ type }: Props) {
	const { t } = useTranslation();
	const { notify } = useNotifications();
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const nav = useNavigate();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const name = e.currentTarget.Name.value;
		const email = e.currentTarget.email.value;
		const password = e.currentTarget.password.value;
		const confirmPassword = e.currentTarget.confirmPassword.value;

		let formErrors: { [key: string]: string } = {};

		if (password !== confirmPassword) {
			formErrors.password = t("auth.passwordsDoNotMatch");
			formErrors.confirmPassword = t("auth.passwordsDoNotMatch");
		}

		const passwordRegex =
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
		if (!passwordRegex.test(password)) {
			formErrors.password = t("auth.passwordRequirements");
		}

		const info: UserInfos = { name, email, password };

		try {
			const response = await fetch(`${API_BASE_URL}/api/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(info),
			});

			if (response.ok) {
				notify({
					variant: "success",
					message: t("auth.registrationSuccess"),
				});
				nav("/auth");
			} else {
				const data = await response.json();
				notify({
					variant: "error",
					message: `${t("auth.error")}: ${
						data.error || t("auth.serverError")
					}`,
				});
			}
		} catch (error) {
			notify({
				variant: "error",
				message: t("auth.networkError"),
			});
		}
	};

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<img
					alt="Logo"
					src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
					className="mx-auto h-10 w-auto"
				/>
				<h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
					{type}
				</h2>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label
							htmlFor="Name"
							className="block text-sm font-medium text-gray-900"
						>
							{t("auth.name")}
						</label>
						<div className="mt-2">
							<input
								id="Name"
								name="Name"
								type="text"
								placeholder={t("auth.namePlaceholder")}
								required
								className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-900"
						>
							{t("auth.email")}
						</label>
						<div className="mt-2">
							<input
								id="email"
								name="email"
								type="email"
								placeholder={t("auth.emailPlaceholder")}
								required
								className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-900"
						>
							{t("auth.password")}
						</label>
						<div className="mt-2">
							<input
								id="password"
								name="password"
								type="password"
								placeholder={t("auth.passwordPlaceholder")}
								required
								className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
							/>
							{errors.password && (
								<p className="text-sm text-red-500 mt-1">
									{errors.password}
								</p>
							)}
						</div>
					</div>

					<div>
						<label
							htmlFor="confirmPassword"
							className="block text-sm font-medium text-gray-900"
						>
							{t("auth.confirmPassword")}
						</label>
						<div className="mt-2">
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								placeholder={t(
									"auth.confirmPasswordPlaceholder"
								)}
								required
								className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
							/>
							{errors.confirmPassword && (
								<p className="text-sm text-red-500 mt-1">
									{errors.confirmPassword}
								</p>
							)}
						</div>
					</div>

					<div>
						<button
							type="submit"
							className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-indigo-600"
						>
							{t("auth.signIn")}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
