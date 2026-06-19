import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { db } from '$lib/server/db';
import { patientTasks } from '$lib/server/db/schema';

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

function getSafeExtension(fileName) {
	const extension = extname(fileName);

	if (!extension) {
		return '.bin';
	}

	return extension;
}

async function saveFileLocally(file) {
	const uploadDir = join(process.cwd(), 'static', 'uploads');

	await mkdir(uploadDir, { recursive: true });

	const extension = getSafeExtension(file.name);
	const safeFileName = randomUUID() + extension;
	const filePath = join(uploadDir, safeFileName);

	const arrayBuffer = await file.arrayBuffer();
	await writeFile(filePath, Buffer.from(arrayBuffer));

	return '/uploads/' + safeFileName;
}

async function saveFileToBlob(file) {
	const extension = getSafeExtension(file.name);
	const safeFileName = 'patient-tasks/' + randomUUID() + extension;

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
		if (process.env.VERCEL === '1' || process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) {
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

		const tasks = await db
			.select()
			.from(patientTasks)
			.where(eq(patientTasks.cpr, cpr));

		return json({
			tasks: tasks
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Opgaver kunne ikke hentes.' },
			{ status: 500 }
		);
	}
}

export async function POST({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan oprette opgaver for patienter.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const title = body.title?.trim();
		const dueDate = body.dueDate;
		const note = body.note?.trim() || '';

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!title || !dueDate) {
			return json(
				{ message: 'Udfyld opgavetitel og frist.' },
				{ status: 400 }
			);
		}

		await db.insert(patientTasks).values({
			cpr: cpr,
			title: title,
			dueDate: dueDate,
			note: note,
			isDone: false,
			submissionComment: null,
			submittedFileName: null,
			submittedAt: null,
			doctorReply: null,
			doctorRepliedAt: null
		});

		return json(
			{
				message: 'Opgaven er oprettet for patienten.'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Opgaven kunne ikke oprettes.' },
			{ status: 500 }
		);
	}
}

export async function PATCH({ request, cookies, url }) {
	try {
		const role = cookies.get('role');
		const contentType = request.headers.get('content-type') || '';

		if (contentType.includes('multipart/form-data')) {
			const patientCpr = cookies.get('cpr');

			if (!patientCpr) {
				return json(
					{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
					{ status: 401 }
				);
			}

			const formData = await request.formData();

			const taskId = Number(formData.get('id'));
			const submissionComment = formData.get('submissionComment') || '';
			const files = formData.getAll('files');

			if (!taskId) {
				return json(
					{ message: 'Der mangler opgave-ID.' },
					{ status: 400 }
				);
			}

			const foundTasks = await db
				.select()
				.from(patientTasks)
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, patientCpr)));

			if (foundTasks.length === 0) {
				return json(
					{ message: 'Opgaven blev ikke fundet.' },
					{ status: 404 }
				);
			}

			const savedFilePaths = await saveUploadedFiles(files);

			await db
				.update(patientTasks)
				.set({
					isDone: true,
					submissionComment: submissionComment,
					submittedFileName:
						savedFilePaths.length > 0
							? savedFilePaths.join(', ')
							: foundTasks[0].submittedFileName,
					submittedAt: new Date()
				})
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, patientCpr)));

			return json({
				message: 'Opgaven er indsendt med vedhæftede filer.'
			});
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const taskId = Number(body.id);
		const action = body.action;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!taskId) {
			return json(
				{ message: 'Der mangler opgave-ID.' },
				{ status: 400 }
			);
		}

		const foundTasks = await db
			.select()
			.from(patientTasks)
			.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

		if (foundTasks.length === 0) {
			return json(
				{ message: 'Opgaven blev ikke fundet.' },
				{ status: 404 }
			);
		}

		if (action === 'doctor-reply') {
			if (role !== 'laege') {
				return json(
					{ message: 'Kun læger kan skrive svar til patientens opgave.' },
					{ status: 403 }
				);
			}

			const doctorReply = body.doctorReply?.trim() || '';

			if (!doctorReply) {
				return json(
					{ message: 'Skriv et svar til patienten.' },
					{ status: 400 }
				);
			}

			await db
				.update(patientTasks)
				.set({
					doctorReply: doctorReply,
					doctorRepliedAt: new Date()
				})
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

			return json({
				message: 'Svar til patientens opgave er gemt.'
			});
		}

		if (action === 'submit') {
			const submissionComment = body.submissionComment?.trim() || '';

			await db
				.update(patientTasks)
				.set({
					isDone: true,
					submissionComment: submissionComment,
					submittedAt: new Date()
				})
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

			return json({
				message: 'Opgaven er markeret som indsendt.'
			});
		}

		if (action === 'complete' || body.isDone === true) {
			await db
				.update(patientTasks)
				.set({
					isDone: true,
					submittedAt: new Date()
				})
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

			return json({
				message: 'Opgaven er markeret som fuldført.'
			});
		}

		if (action === 'reopen' || body.isDone === false) {
			await db
				.update(patientTasks)
				.set({
					isDone: false
				})
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

			return json({
				message: 'Opgaven er genåbnet.'
			});
		}

		if (action === 'update') {
			if (role !== 'laege') {
				return json(
					{ message: 'Kun læger kan ændre opgaver.' },
					{ status: 403 }
				);
			}

			const title = body.title?.trim();
			const dueDate = body.dueDate;
			const note = body.note?.trim() || '';

			if (!title || !dueDate) {
				return json(
					{ message: 'Udfyld opgavetitel og frist.' },
					{ status: 400 }
				);
			}

			await db
				.update(patientTasks)
				.set({
					title: title,
					dueDate: dueDate,
					note: note
				})
				.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

			return json({
				message: 'Opgaven er opdateret.'
			});
		}

		return json(
			{ message: 'Ugyldig handling.' },
			{ status: 400 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Opgaven kunne ikke ændres.' },
			{ status: 500 }
		);
	}
}

export async function DELETE({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan slette opgaver.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const taskId = Number(body.id);

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!taskId) {
			return json(
				{ message: 'Der mangler opgave-ID.' },
				{ status: 400 }
			);
		}

		await db
			.delete(patientTasks)
			.where(and(eq(patientTasks.id, taskId), eq(patientTasks.cpr, cpr)));

		return json({
			message: 'Opgaven er slettet.'
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Opgaven kunne ikke slettes.' },
			{ status: 500 }
		);
	}
}