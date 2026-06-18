import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { labResults } from '$lib/server/db/schema';

function getTargetCpr({ cookies, url, body }) {
	const role = cookies.get('role');
	const patientCpr = cookies.get('cpr');

	if (role === 'laege') {
		return url?.searchParams?.get('cpr') || body?.cpr || '';
	}

	return patientCpr || '';
}

export async function GET({ cookies, url }) {
	try {
		const cpr = getTargetCpr({ cookies, url });

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 401 }
			);
		}

		const results = await db
			.select()
			.from(labResults)
			.where(eq(labResults.cpr, cpr));

		return json({
			results: results
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Prøvesvar kunne ikke hentes.' },
			{ status: 500 }
		);
	}
}

export async function POST({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan oprette prøvesvar.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const title = body.title?.trim();
		const result = body.result?.trim();
		const referenceRange = body.referenceRange?.trim() || '';
		const assessment = body.assessment?.trim() || '';
		const date = body.date;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!title || !result || !date) {
			return json(
				{ message: 'Udfyld prøvetype, resultat og dato.' },
				{ status: 400 }
			);
		}

		await db.insert(labResults).values({
			cpr: cpr,
			title: title,
			result: result,
			referenceRange: referenceRange,
			assessment: assessment,
			date: date
		});

		return json(
			{
				message: 'Prøvesvaret er oprettet for patienten.'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Prøvesvaret kunne ikke oprettes.' },
			{ status: 500 }
		);
	}
}