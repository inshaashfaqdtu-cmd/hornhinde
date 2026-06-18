import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { appointments, bookingRequests } from '$lib/server/db/schema';

export async function GET({ cookies, url }) {
	try {
		const role = cookies.get('role');
		const loggedInCpr = cookies.get('cpr');
		const searchedCpr = url.searchParams.get('cpr');

		let cpr = loggedInCpr;

		if (role === 'laege' && searchedCpr) {
			cpr = searchedCpr;
		}

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for brugeren.' },
				{ status: 401 }
			);
		}

		const patientAppointments = await db
			.select()
			.from(appointments)
			.where(eq(appointments.cpr, cpr));

		return json({
			appointments: patientAppointments
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Der skete en fejl ved hentning af aftaler.' },
			{ status: 500 }
		);
	}
}

export async function POST({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan oprette aftaler for patienter.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = url.searchParams.get('cpr') || body.cpr;
		const title = body.title?.trim();
		const date = body.date;
		const time = body.time;
		const location = body.location || 'Øjenambulatoriet';

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!title || !date || !time) {
			return json(
				{ message: 'Udfyld aftaletype, dato og klokkeslæt.' },
				{ status: 400 }
			);
		}

		const insertedAppointments = await db
			.insert(appointments)
			.values({
				cpr,
				date,
				time,
				title,
				location,
				status: 'kommende'
			})
			.returning({
				id: appointments.id
			});

		return json(
			{
				message: 'Aftalen er oprettet for patienten.',
				appointmentId: insertedAppointments[0]?.id || null
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Aftalen kunne ikke oprettes.' },
			{ status: 500 }
		);
	}
}

export async function PATCH({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan ændre aftaler.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = url.searchParams.get('cpr') || body.cpr;
		const appointmentId = body.id;
		const action = body.action;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!appointmentId) {
			return json(
				{ message: 'Der mangler aftale-ID.' },
				{ status: 400 }
			);
		}

		const foundAppointments = await db
			.select()
			.from(appointments)
			.where(and(eq(appointments.id, appointmentId), eq(appointments.cpr, cpr)));

		if (foundAppointments.length === 0) {
			return json(
				{ message: 'Aftalen blev ikke fundet.' },
				{ status: 404 }
			);
		}

		const appointment = foundAppointments[0];

		if (action === 'cancel') {
			await db
				.update(appointments)
				.set({
					status: 'aflyst'
				})
				.where(and(eq(appointments.id, appointmentId), eq(appointments.cpr, cpr)));

			await db
				.update(bookingRequests)
				.set({
					status: 'annulleret'
				})
				.where(
					and(
						eq(bookingRequests.appointmentId, appointmentId),
						eq(bookingRequests.cpr, cpr)
					)
				);

			return json({
				message: 'Aftalen er aflyst, og den tilknyttede bookinganmodning er annulleret.'
			});
		}

		if (action === 'save-notes') {
			if (appointment.status === 'aflyst') {
				return json(
					{ message: 'Der kan ikke oprettes journalnotat på en aflyst aftale.' },
					{ status: 400 }
				);
			}

			const visitSummary = body.visitSummary?.trim() || '';
			const journalNote = body.journalNote?.trim() || '';

			if (!visitSummary && !journalNote) {
				return json(
					{ message: 'Udfyld enten besøgssammendrag eller journalnotat.' },
					{ status: 400 }
				);
			}

			await db
				.update(appointments)
				.set({
					visitSummary,
					journalNote,
					status: 'afholdt'
				})
				.where(and(eq(appointments.id, appointmentId), eq(appointments.cpr, cpr)));

			return json({
				message: 'Besøgssammendrag og journalnotat er gemt. Aftalen er markeret som afholdt.'
			});
		}

		return json(
			{ message: 'Ugyldig handling.' },
			{ status: 400 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Aftalen kunne ikke ændres.' },
			{ status: 500 }
		);
	}
}

export async function DELETE({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan aflyse aftaler.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = url.searchParams.get('cpr') || body.cpr;
		const appointmentId = body.id;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!appointmentId) {
			return json(
				{ message: 'Der mangler aftale-ID.' },
				{ status: 400 }
			);
		}

		const foundAppointments = await db
			.select()
			.from(appointments)
			.where(and(eq(appointments.id, appointmentId), eq(appointments.cpr, cpr)));

		if (foundAppointments.length === 0) {
			return json(
				{ message: 'Aftalen blev ikke fundet.' },
				{ status: 404 }
			);
		}

		await db
			.update(appointments)
			.set({
				status: 'aflyst'
			})
			.where(and(eq(appointments.id, appointmentId), eq(appointments.cpr, cpr)));

		await db
			.update(bookingRequests)
			.set({
				status: 'annulleret'
			})
			.where(
				and(
					eq(bookingRequests.appointmentId, appointmentId),
					eq(bookingRequests.cpr, cpr)
				)
			);

		return json({
			message: 'Aftalen er aflyst, og den tilknyttede bookinganmodning er annulleret.'
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Aftalen kunne ikke aflyses.' },
			{ status: 500 }
		);
	}
}