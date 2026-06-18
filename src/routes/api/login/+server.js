import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export async function POST({ request, cookies }) {
	try {
		const body = await request.json();

		const username = body.username?.trim();
		const password = body.password?.trim();

		if (!username || !password) {
			return json(
				{ message: 'Indtast brugernavn og password.' },
				{ status: 400 }
			);
		}

		const foundUsers = await db
			.select()
			.from(users)
			.where(eq(users.username, username));

		if (foundUsers.length === 0) {
			return json(
				{ message: 'Forkert brugernavn eller password.' },
				{ status: 401 }
			);
		}

		const user = foundUsers[0];

		const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);

		if (!passwordIsCorrect) {
			return json(
				{ message: 'Forkert brugernavn eller password.' },
				{ status: 401 }
			);
		}

		cookies.set('userId', String(user.id), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		cookies.set('username', user.username, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		cookies.set('role', user.role, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		if (user.cpr) {
			cookies.set('cpr', user.cpr, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false
			});
		}

		return json({
			message: 'Login lykkedes.',
			role: user.role,
			cpr: user.cpr,
			username: user.username
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Der skete en fejl under login.' },
			{ status: 500 }
		);
	}
}