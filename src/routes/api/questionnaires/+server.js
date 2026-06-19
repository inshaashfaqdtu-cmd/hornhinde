import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { questionnaires, questionnaireResponses } from '$lib/server/db/schema';

const defaultQuestions = [
	{
		id: 'drynessScore',
		label: 'Tørhed i øjet fra 0-10',
		type: 'score',
		required: true
	},
	{
		id: 'rednessScore',
		label: 'Rødme fra 0-10',
		type: 'score',
		required: true
	},
	{
		id: 'painScore',
		label: 'Smerte fra 0-10',
		type: 'score',
		required: true
	},
	{
		id: 'blurredVision',
		label: 'Oplever du sløret syn?',
		type: 'boolean',
		required: false
	},
	{
		id: 'lightSensitivity',
		label: 'Oplever du lysfølsomhed?',
		type: 'boolean',
		required: false
	},
	{
		id: 'burningFeeling',
		label: 'Oplever du svie eller brændende fornemmelse?',
		type: 'boolean',
		required: false
	},
	{
		id: 'symptomStartDate',
		label: 'Hvornår startede symptomerne?',
		type: 'date',
		required: false
	},
	{
		id: 'patientComment',
		label: 'Kommentar til afdelingen',
		type: 'textarea',
		required: false
	}
];

function getTargetCpr({ cookies, url, body }) {
	const role = cookies.get('role');
	const patientCpr = cookies.get('cpr');

	if (role === 'laege') {
		return url?.searchParams?.get('cpr') || body?.cpr || '';
	}

	return patientCpr || '';
}

function normalizeBoolean(value) {
	return value === true || value === 'true' || value === 'on';
}

function normalizeNumber(value) {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) {
		return null;
	}

	if (numberValue < 0) {
		return 0;
	}

	if (numberValue > 10) {
		return 10;
	}

	return numberValue;
}

function parseQuestionsJson(questionsJson) {
	if (!questionsJson) {
		return defaultQuestions;
	}

	try {
		const parsedQuestions = JSON.parse(questionsJson);

		if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
			return defaultQuestions;
		}

		return parsedQuestions;
	} catch {
		return defaultQuestions;
	}
}

function normalizeQuestions(questions) {
	if (!Array.isArray(questions) || questions.length === 0) {
		return defaultQuestions;
	}

	const allowedQuestionIds = defaultQuestions.map((question) => question.id);

	const normalizedQuestions = questions
		.filter((question) => allowedQuestionIds.includes(question.id))
		.map((question) => {
			const defaultQuestion = defaultQuestions.find((item) => item.id === question.id);

			return {
				id: defaultQuestion.id,
				label: question.label?.trim() || defaultQuestion.label,
				type: defaultQuestion.type,
				required: Boolean(question.required)
			};
		});

	if (normalizedQuestions.length === 0) {
		return defaultQuestions;
	}

	return normalizedQuestions;
}

function questionIsIncluded(questions, questionId) {
	return questions.some((question) => question.id === questionId);
}

function questionIsRequired(questions, questionId) {
	const question = questions.find((item) => item.id === questionId);
	return Boolean(question?.required);
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

		const patientQuestionnaires = await db
			.select()
			.from(questionnaires)
			.where(eq(questionnaires.cpr, cpr));

		const patientResponses = await db
			.select()
			.from(questionnaireResponses)
			.where(eq(questionnaireResponses.cpr, cpr));

		const questionnairesWithResponses = patientQuestionnaires.map((questionnaire) => {
			const response =
				patientResponses.find((item) => item.questionnaireId === questionnaire.id) || null;

			return {
				...questionnaire,
				questions: parseQuestionsJson(questionnaire.questionsJson),
				response
			};
		});

		return json({
			questionnaires: questionnairesWithResponses
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Spørgeskemaer kunne ikke hentes.' },
			{ status: 500 }
		);
	}
}

export async function POST({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan oprette spørgeskemaer for patienter.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const title = body.title?.trim();
		const description = body.description?.trim() || '';
		const selectedQuestions = normalizeQuestions(body.questions);

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!title) {
			return json(
				{ message: 'Udfyld titel på spørgeskemaet.' },
				{ status: 400 }
			);
		}

		await db.insert(questionnaires).values({
			cpr: cpr,
			title: title,
			description: description,
			questionsJson: JSON.stringify(selectedQuestions),
			status: 'ny',
			reviewedAt: null
		});

		return json(
			{
				message: 'Spørgeskemaet er oprettet for patienten.'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Spørgeskemaet kunne ikke oprettes.' },
			{ status: 500 }
		);
	}
}

export async function PATCH({ request, cookies, url }) {
	try {
		const role = cookies.get('role');
		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const questionnaireId = Number(body.id);
		const action = body.action;

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!questionnaireId || !action) {
			return json(
				{ message: 'Der mangler spørgeskema-ID eller handling.' },
				{ status: 400 }
			);
		}

		const foundQuestionnaires = await db
			.select()
			.from(questionnaires)
			.where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.cpr, cpr)));

		if (foundQuestionnaires.length === 0) {
			return json(
				{ message: 'Spørgeskemaet blev ikke fundet.' },
				{ status: 404 }
			);
		}

		const questionnaire = foundQuestionnaires[0];
		const selectedQuestions = parseQuestionsJson(questionnaire.questionsJson);

		if (action === 'submit-response') {
			if (role === 'laege') {
				return json(
					{ message: 'Lægen kan ikke udfylde spørgeskemaet som patient.' },
					{ status: 403 }
				);
			}

			const patientCpr = cookies.get('cpr');

			if (!patientCpr) {
				return json(
					{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
					{ status: 401 }
				);
			}

			const drynessScore = questionIsIncluded(selectedQuestions, 'drynessScore')
				? normalizeNumber(body.drynessScore)
				: null;

			const rednessScore = questionIsIncluded(selectedQuestions, 'rednessScore')
				? normalizeNumber(body.rednessScore)
				: null;

			const painScore = questionIsIncluded(selectedQuestions, 'painScore')
				? normalizeNumber(body.painScore)
				: null;

			const blurredVision = questionIsIncluded(selectedQuestions, 'blurredVision')
				? normalizeBoolean(body.blurredVision)
				: false;

			const lightSensitivity = questionIsIncluded(selectedQuestions, 'lightSensitivity')
				? normalizeBoolean(body.lightSensitivity)
				: false;

			const burningFeeling = questionIsIncluded(selectedQuestions, 'burningFeeling')
				? normalizeBoolean(body.burningFeeling)
				: false;

			const symptomStartDate = questionIsIncluded(selectedQuestions, 'symptomStartDate')
				? body.symptomStartDate || ''
				: '';

			const patientComment = questionIsIncluded(selectedQuestions, 'patientComment')
				? body.patientComment?.trim() || ''
				: '';

			if (questionIsRequired(selectedQuestions, 'drynessScore') && drynessScore === null) {
				return json(
					{ message: 'Udfyld tørhed fra 0-10.' },
					{ status: 400 }
				);
			}

			if (questionIsRequired(selectedQuestions, 'rednessScore') && rednessScore === null) {
				return json(
					{ message: 'Udfyld rødme fra 0-10.' },
					{ status: 400 }
				);
			}

			if (questionIsRequired(selectedQuestions, 'painScore') && painScore === null) {
				return json(
					{ message: 'Udfyld smerte fra 0-10.' },
					{ status: 400 }
				);
			}

			const existingResponses = await db
				.select()
				.from(questionnaireResponses)
				.where(
					and(
						eq(questionnaireResponses.questionnaireId, questionnaireId),
						eq(questionnaireResponses.cpr, patientCpr)
					)
				);

			if (existingResponses.length > 0) {
				await db
					.update(questionnaireResponses)
					.set({
						drynessScore: drynessScore,
						rednessScore: rednessScore,
						painScore: painScore,
						blurredVision: blurredVision,
						lightSensitivity: lightSensitivity,
						burningFeeling: burningFeeling,
						symptomStartDate: symptomStartDate,
						patientComment: patientComment,
						submittedAt: new Date()
					})
					.where(
						and(
							eq(questionnaireResponses.questionnaireId, questionnaireId),
							eq(questionnaireResponses.cpr, patientCpr)
						)
					);
			} else {
				await db.insert(questionnaireResponses).values({
					questionnaireId: questionnaireId,
					cpr: patientCpr,
					drynessScore: drynessScore,
					rednessScore: rednessScore,
					painScore: painScore,
					blurredVision: blurredVision,
					lightSensitivity: lightSensitivity,
					burningFeeling: burningFeeling,
					symptomStartDate: symptomStartDate,
					patientComment: patientComment
				});
			}

			await db
				.update(questionnaires)
				.set({
					status: 'besvaret'
				})
				.where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.cpr, patientCpr)));

			return json({
				message: 'Spørgeskemaet er indsendt til afdelingen.'
			});
		}

		if (action === 'review') {
			if (role !== 'laege') {
				return json(
					{ message: 'Kun læger kan markere spørgeskemaer som gennemgået.' },
					{ status: 403 }
				);
			}

			await db
				.update(questionnaires)
				.set({
					status: 'gennemgået',
					reviewedAt: new Date()
				})
				.where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.cpr, cpr)));

			return json({
				message: 'Spørgeskemaet er markeret som gennemgået.'
			});
		}

		if (action === 'reopen') {
			if (role !== 'laege') {
				return json(
					{ message: 'Kun læger kan genåbne spørgeskemaer.' },
					{ status: 403 }
				);
			}

			await db
				.update(questionnaires)
				.set({
					status: 'ny',
					reviewedAt: null
				})
				.where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.cpr, cpr)));

			return json({
				message: 'Spørgeskemaet er genåbnet.'
			});
		}

		return json(
			{ message: 'Ugyldig handling.' },
			{ status: 400 }
		);
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Spørgeskemaet kunne ikke ændres.' },
			{ status: 500 }
		);
	}
}

export async function DELETE({ request, cookies, url }) {
	try {
		const role = cookies.get('role');

		if (role !== 'laege') {
			return json(
				{ message: 'Kun læger kan slette spørgeskemaer.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		const cpr = getTargetCpr({ cookies, url, body });
		const questionnaireId = Number(body.id);

		if (!cpr) {
			return json(
				{ message: 'Der blev ikke fundet et CPR-nummer for patienten.' },
				{ status: 400 }
			);
		}

		if (!questionnaireId) {
			return json(
				{ message: 'Der mangler spørgeskema-ID.' },
				{ status: 400 }
			);
		}

		await db
			.delete(questionnaireResponses)
			.where(
				and(
					eq(questionnaireResponses.questionnaireId, questionnaireId),
					eq(questionnaireResponses.cpr, cpr)
				)
			);

		await db
			.delete(questionnaires)
			.where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.cpr, cpr)));

		return json({
			message: 'Spørgeskemaet er slettet.'
		});
	} catch (error) {
		console.error(error);

		return json(
			{ message: 'Spørgeskemaet kunne ikke slettes.' },
			{ status: 500 }
		);
	}
}