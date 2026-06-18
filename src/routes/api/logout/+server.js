import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
	cookies.delete('userId', { path: '/' });
	cookies.delete('username', { path: '/' });
	cookies.delete('role', { path: '/' });
	cookies.delete('cpr', { path: '/' });

	return json({
		message: 'Brugeren er logget ud.'
	});
}