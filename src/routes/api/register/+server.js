import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { db } from '$lib/server/db';
import { users, patients } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
	try {
		const body = await request.json();

		const username = body.username?.trim();
		const password = body.password?.trim();
		const repeatPassword = body.repeatPassword?.trim();
		const role = body.role;
		const cpr = body.cpr?.trim();

		if (!username || !password || !repeatPassword || !role) {
			return json(
				{ message: 'Udfyld brugernavn, password og rolle.' },
				{ status: 400 }
			);
		}

		if (password !== repeatPassword) {
			return json(
				{ message: 'Password og gentaget password er ikke ens.' },
				{ status: 400 }
			);
		}

		if (role !== 'patient' && role !== 'laege') {
			return json(
				{ message: 'Vælg enten patient eller læge.' },
				{ status: 400 }
			);
		}

		if (role === 'patient' && (!cpr || cpr.length !== 10)) {
			return json(
				{ message: 'Patienter skal have et CPR-nummer på 10 cifre.' },
				{ status: 400 }
			);
		}

		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.username, username));

		if (existingUser.length > 0) {
			return json(
				{ message: 'Brugernavnet findes allerede.' },
				{ status: 409 }
			);
		}

		const passwordHash = await bcrypt.hash(password, 10);

		await db.insert(users).values({
			username,
			passwordHash,
			role,
			cpr: role === 'patient' ? cpr : null
		});

		if (role === 'patient') {
			await db
				.insert(patients)
				.values({
					cpr,
					name: username
				})
				.onConflictDoNothing({
					target: patients.cpr
				});
		}

		return json(
			{
				message: 'Brugeren er oprettet.',
				role
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Der skete en fejl ved oprettelse af brugeren.' },
			{ status: 500 }
		);
	}
}