import { API_BASE_URL } from './config/api';

interface Options {
	method?: 'POST' | 'GET';
	headers?: Record<string, string>;
	body?: string
}

export default async function fetchData<T>(api: string, options: Options = { method: 'GET' }): Promise<T> {
	try {
		const response: Response = await fetch(`${API_BASE_URL}/api/${api}`, options);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data: T = await response.json();
		return (data);
	} catch (error) {
		console.log("Error:" + error);
		throw error;
	}
}