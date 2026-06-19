import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
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

function getRealFiles(files) {
	return files.filter((file) => {
		return file && file.size > 0 && file.name;
	});
}

async function saveFileLocally(file) {
	const uploadDir = join(process.cwd(), 'static', 'uploads');

	await mkdir(uploadDir, { recursive: true });

	const extension = extname(file.name);
	const safeFileName = randomUUID() + extension;
	const filePath = join(uploadDir, safeFileName);

	const arrayBuffer = await file.arrayBuffer();
	await writeFile(filePath, Buffer.from(arrayBuffer));

	return '/uploads/' + safeFileName;
}

async function saveFileToBlob(file) {
	const extension = extname(file.name);
	const safeFileName = 'booking-requests/' + randomUUID() + extension;

	const blob = await put(safeFileName, file, {
		access: 'public'
	});

	return blob.url;
}

async function saveUploadedFiles(files) {
	const realFiles = getRealFiles(files);

	if (realFiles.length === 0) {
		return [];
	}

	const savedFilePaths = [];

	for (const file of realFiles) {
		if (process.env.BLOB_READ_WRITE_TOKEN) {
			const blobUrl = await saveFileToBlob(file);
			savedFilePaths.push(blobUrl);
		} else {
			const localPath = await saveFileLocally(file);
			savedFilePaths.push(localPath);
		}
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
		const role = cookies.get('role');
		const patientCpr = cookies.get('cpr');

		if (!patientCpr && role !== 'laege') {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 401 }
			);
		}

		const formData = await request.formData();

		const appointmentType = formData.get('appointmentType');
		const preferredDate = formData.get('preferredDate');
		const preferredTime = formData.get('preferredTime');
		const comment = formData.get('comment') || '';
		const files = formData.getAll('files');

		const cpr = patientCpr;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!appointmentType || !preferredDate || !preferredTime) {
			return json(
				{ message: 'Vælg aftaletype, dato og klokkeslæt.' },
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
			status: 'afventer'
		});

		return json(
			{
				message: 'Bookinganmodningen er sendt til afdelingen.'
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
		const requestId = Number(body.id);
		const action = body.action;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!requestId || !action) {
			return json(
				{ message: 'Der mangler booking-ID eller handling.' },
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

		if (action === 'approve') {
			if (!bookingRequest.preferredDate || !bookingRequest.preferredTime) {
				return json(
					{ message: 'Bookinganmodningen mangler dato eller klokkeslæt.' },
					{ status: 400 }
				);
			}

			const insertedAppointments = await db
				.insert(appointments)
				.values({
					cpr: cpr,
					date: bookingRequest.preferredDate,
					time: bookingRequest.preferredTime,
					title: getAppointmentTitle(bookingRequest.appointmentType),
					location: 'Øjenambulatoriet',
					status: 'kommende'
				})
				.returning({
					id: appointments.id
				});

			await db
				.update(bookingRequests)
				.set({
					status: 'godkendt',
					appointmentId: insertedAppointments[0]?.id || null
				})
				.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

			return json({
				message: 'Bookinganmodningen er godkendt, og aftalen er oprettet.'
			});
		}

		if (action === 'change') {
			const newDate = body.preferredDate;
			const newTime = body.preferredTime;
			const newLocation = body.location || 'Øjenambulatoriet';

			if (!newDate || !newTime) {
				return json(
					{ message: 'Vælg ny dato og nyt klokkeslæt.' },
					{ status: 400 }
				);
			}

			const insertedAppointments = await db
				.insert(appointments)
				.values({
					cpr: cpr,
					date: newDate,
					time: newTime,
					title: getAppointmentTitle(bookingRequest.appointmentType),
					location: newLocation,
					status: 'kommende'
				})
				.returning({
					id: appointments.id
				});

			await db
				.update(bookingRequests)
				.set({
					preferredDate: newDate,
					preferredTime: newTime,
					status: 'ændret og godkendt',
					appointmentId: insertedAppointments[0]?.id || null
				})
				.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

			return json({
				message: 'Bookinganmodningen er ændret og godkendt.'
			});
		}

		if (action === 'reject') {
			await db
				.update(bookingRequests)
				.set({
					status: 'afvist'
				})
				.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

			return json({
				message: 'Bookinganmodningen er afvist.'
			});
		}

		if (action === 'cancel') {
			await db
				.update(bookingRequests)
				.set({
					status: 'annulleret'
				})
				.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

			return json({
				message: 'Bookinganmodningen er annulleret.'
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

export async function DELETE({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan slette bookinganmodninger.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const requestId = Number(body.id);

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!requestId) {
			return json(
				{ message: 'Der mangler booking-ID.' },
				{ status: 400 }
			);
		}

		await db
			.delete(bookingRequests)
			.where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.cpr, cpr)));

		return json({
			message: 'Bookinganmodningen er slettet.'
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Bookinganmodningen kunne ikke slettes.' },
			{ status: 500 }
		);
	}
}