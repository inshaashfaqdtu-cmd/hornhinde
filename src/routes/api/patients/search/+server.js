import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { patients } from '$lib/server/db/schema';

export async function GET({ url, cookies }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Du har ikke adgang til patientdatabasen.' },
				{ status: 403 }
			);
		}

		const cpr = url.searchParams.get('cpr');

		if (!cpr || cpr.length !== 10) {
			return json(
				{ message: 'Indtast et CPR-nummer på 10 cifre.' },
				{ status: 400 }
			);
		}

		const foundPatients = await db
			.select()
			.from(patients)
			.where(eq(patients.cpr, cpr));

		if (foundPatients.length === 0) {
			return json(
				{ message: 'Der blev ikke fundet en patient med dette CPR-nummer.' },
				{ status: 404 }
			);
		}

		return json({
			patient: foundPatients[0]
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Der skete en fejl ved søgning efter patienten.' },
			{ status: 500 }
		);
	}
}