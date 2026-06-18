import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, patients } from '$lib/server/db/schema';

export async function GET({ cookies }) {
	try {
		const userId = cookies.get('userId');

		if (!userId) {
			return json(
				{ message: 'Brugeren er ikke logget ind.' },
				{ status: 401 }
			);
		}

		const foundUsers = await db
			.select()
			.from(users)
			.where(eq(users.id, Number(userId)));

		if (foundUsers.length === 0) {
			return json(
				{ message: 'Brugeren findes ikke i databasen.' },
				{ status: 404 }
			);
		}

		const user = foundUsers[0];

		let patient = null;

		if (user.role === 'patient' && user.cpr) {
			const foundPatients = await db
				.select()
				.from(patients)
				.where(eq(patients.cpr, user.cpr));

			if (foundPatients.length > 0) {
				patient = foundPatients[0];
			}
		}

		return json({
			id: user.id,
			username: user.username,
			role: user.role,
			cpr: user.cpr,
			patient: patient
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Der skete en fejl ved hentning af brugerdata.' },
			{ status: 500 }
		);
	}
}