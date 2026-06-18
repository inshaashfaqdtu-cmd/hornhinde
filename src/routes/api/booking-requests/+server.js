import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { db } from '$lib/server/db';
import { bookingRequests, appointments } from '$lib/server/db/schema';

function getAppointmentTitle(appointmentType) {
	if (appointmentType === 'hornhinde') {
		return 'Hornhindekontrol';
	}

	if (appointmentType === 'blodprove-ekg') {
		return 'Blodprøve og EKG';
	}

	return appointmentType || 'Aftale';
}

function getTargetCpr({ cookies, url, body }) {
	const role = cookies.get('role');
	const patientCpr = cookies.get('cpr');

	if (role === 'laege') {
		return url?.searchParams?.get('cpr') || body?.cpr || '';
	}

	return patientCpr || '';
}

async function saveUploadedFiles(files) {
	const savedFilePaths = [];
	const uploadDir = join(process.cwd(), 'static', 'uploads');

	await mkdir(uploadDir, { recursive: true });

	for (const file of files) {
		if (!file || file.size === 0 || !file.name) {
			continue;
		}

		const extension = extname(file.name);
		const safeFileName = randomUUID() + extension;
		const filePath = join(uploadDir, safeFileName);

		const arrayBuffer = await file.arrayBuffer();
		await writeFile(filePath, Buffer.from(arrayBuffer));

		savedFilePaths.push('/uploads/' + safeFileName);
	}

	return savedFilePaths;
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

		const requests = await db
			.select()
			.from(bookingRequests)
			.where(eq(bookingRequests.cpr, cpr));

		return json({
			requests: requests
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Bookinganmodninger kunne ikke hentes.' },
			{ status: 500 }
		);
	}
}

export async function POST({ request, cookies }) {
	try {
		const cpr = cookies.get('cpr');

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for brugeren.' },
				{ status: 401 }
			);
		}

		const formData = await request.formData();

		const appointmentType = formData.get('appointmentType');
		const preferredDate = formData.get('preferredDate');
		const preferredTime = formData.get('preferredTime');
		const comment = formData.get('comment') || '';
		const files = formData.getAll('files');

		if (!appointmentType || !preferredDate || !preferredTime) {
			return json(
				{ message: 'Vælg aftaletype, ønsket dato og ønsket klokkeslæt.' },
				{ status: 400 }
			);
		}

		const savedFilePaths = await saveUploadedFiles(files);

		await db.insert(bookingRequests).values({
			cpr: cpr,
			appointmentType: appointmentType,
			preferredDate: preferredDate,
			preferredTime: preferredTime,
			comment: comment,
			attachedFileName: savedFilePaths.join(', '),
			status: 'afventer',
			appointmentId: null
		});

		return json(
			{
				message:
					'Din bookinganmodning er sendt til afdelingen. Du får besked, når afdelingen har behandlet den.'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Der skete en fejl ved bookinganmodningen.' },
			{ status: 500 }
		);
	}
}

export async function PATCH({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan behandle bookinganmodninger.' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const cpr = getTargetCpr({ cookies, url, body });

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 401 }
			);
		}

		const requestId = body.id;
		const action = body.action;

		if (!requestId || !action) {
			return json(
				{ message: 'Bookinganmodningen kunne ikke behandles.' },
				{ status: 400 }
			);
		}

		const foundRequests = await db
			.select()
			.from(bookingRequests)
			.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

		if (foundRequests.length === 0) {
			return json(
				{ message: 'Bookinganmodningen blev ikke fundet.' },
				{ status: 404 }
			);
		}

		const bookingRequest = foundRequests[0];

		if (bookingRequest.status !== 'afventer') {
			return json(
				{
					message:
						'Denne bookinganmodning er allerede behandlet og kan ikke oprette en ny aftale igen.'
				},
				{ status: 400 }
			);
		}

		if (action === 'reject') {
			await db
				.update(bookingRequests)
				.set({
					status: 'afvist',
					appointmentId: null
				})
				.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

			return json({
				message: 'Bookinganmodningen er afvist.'
			});
		}

		if (action === 'approve' || action === 'change') {
			const appointmentDate = body.date || bookingRequest.preferredDate;
			const appointmentTime = body.time || bookingRequest.preferredTime;
			const location = body.location || 'Øjenambulatoriet';

			if (!appointmentDate || !appointmentTime) {
				return json(
					{ message: 'Vælg dato og klokkeslæt for aftalen.' },
					{ status: 400 }
				);
			}

			const insertedAppointments = await db
				.insert(appointments)
				.values({
					cpr: cpr,
					date: appointmentDate,
					time: appointmentTime,
					title: getAppointmentTitle(bookingRequest.appointmentType),
					location: location,
					status: 'kommende'
				})
				.returning({
					id: appointments.id
				});

			const appointmentId = insertedAppointments[0]?.id || null;

			await db
				.update(bookingRequests)
				.set({
					status: action === 'approve' ? 'godkendt' : 'ændret',
					appointmentId: appointmentId
				})
				.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

			return json({
				message:
					action === 'approve'
						? 'Bookinganmodningen er godkendt, og aftalen er oprettet.'
						: 'Bookinganmodningen er ændret, og aftalen er oprettet.',
				appointmentId: appointmentId
			});
		}

		return json(
			{ message: 'Ugyldig handling.' },
			{ status: 400 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Bookinganmodningen kunne ikke behandles.' },
			{ status: 500 }
		);
	}
}