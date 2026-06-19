<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const defaultQuestions = [
		{
			id: 'drynessScore',
			label: 'Tørhed i øjet fra 0-10',
			type: 'score',
			required: true,
			selected: true
		},
		{
			id: 'rednessScore',
			label: 'Rødme fra 0-10',
			type: 'score',
			required: true,
			selected: true
		},
		{
			id: 'painScore',
			label: 'Smerte fra 0-10',
			type: 'score',
			required: true,
			selected: true
		},
		{
			id: 'blurredVision',
			label: 'Oplever du sløret syn?',
			type: 'boolean',
			required: false,
			selected: true
		},
		{
			id: 'lightSensitivity',
			label: 'Oplever du lysfølsomhed?',
			type: 'boolean',
			required: false,
			selected: true
		},
		{
			id: 'burningFeeling',
			label: 'Oplever du svie eller brændende fornemmelse?',
			type: 'boolean',
			required: false,
			selected: true
		},
		{
			id: 'symptomStartDate',
			label: 'Hvornår startede symptomerne?',
			type: 'date',
			required: false,
			selected: true
		},
		{
			id: 'patientComment',
			label: 'Kommentar til afdelingen',
			type: 'textarea',
			required: false,
			selected: true
		}
	];

	let loading = $state(true);
	let errorMessage = $state('');
	let message = $state('');
	let messageType = $state('');

	let targetCpr = $state('');
	let isDoctorView = $state(false);

	let questionnaires = $state([]);

	let showCreateForm = $state(false);
	let showPreview = $state(true);
	let newTitle = $state('Symptomspørgeskema');
	let newDescription = $state(
		'Udfyld spørgeskemaet med dine aktuelle øjensymptomer, så afdelingen kan få et bedre overblik.'
	);
	let selectedQuestions = $state(defaultQuestions.map((question) => ({ ...question })));

	let responseForms = $state({});

	onMount(async () => {
		const searchParams = new URLSearchParams(window.location.search);
		targetCpr = searchParams.get('cpr') || '';
		isDoctorView = targetCpr !== '';

		await loadQuestionnaires();
	});

	async function loadQuestionnaires() {
		loading = true;
		errorMessage = '';

		try {
			const endpoint =
				targetCpr !== ''
					? '/api/questionnaires?cpr=' + encodeURIComponent(targetCpr)
					: '/api/questionnaires';

			const response = await fetch(endpoint);
			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Spørgeskemaer kunne ikke hentes.';
				loading = false;
				return;
			}

			questionnaires = data.questionnaires || [];

			questionnaires = questionnaires.sort((a, b) => {
				if (a.status === 'ny' && b.status !== 'ny') {
					return -1;
				}

				if (a.status !== 'ny' && b.status === 'ny') {
					return 1;
				}

				return new Date(b.createdAt) - new Date(a.createdAt);
			});
		} catch {
			errorMessage = 'Der opstod en fejl. Tjek at serveren og databasen kører.';
		} finally {
			loading = false;
		}
	}

	function goBack() {
		if (isDoctorView) {
			goto('/home?cpr=' + encodeURIComponent(targetCpr));
			return;
		}

		goto('/home');
	}

	function getOpenQuestionnaires() {
		return questionnaires.filter((questionnaire) => questionnaire.status === 'ny');
	}

	function getAnsweredQuestionnaires() {
		return questionnaires.filter((questionnaire) => questionnaire.status === 'besvaret');
	}

	function getReviewedQuestionnaires() {
		return questionnaires.filter((questionnaire) => questionnaire.status === 'gennemgået');
	}

	function getSelectedQuestions() {
		return selectedQuestions.filter((question) => question.selected);
	}

	function getQuestionnaireQuestions(questionnaire) {
		if (Array.isArray(questionnaire.questions) && questionnaire.questions.length > 0) {
			return questionnaire.questions;
		}

		return defaultQuestions;
	}

	function formatDate(dateValue) {
		if (!dateValue) {
			return '';
		}

		const date = new Date(dateValue);

		return date.toLocaleDateString('da-DK', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatDateTime(dateValue) {
		if (!dateValue) {
			return '';
		}

		const date = new Date(dateValue);

		return date.toLocaleDateString('da-DK', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusText(status) {
		if (status === 'ny') {
			return 'Skal udfyldes';
		}

		if (status === 'besvaret') {
			return 'Indsendt';
		}

		if (status === 'gennemgået') {
			return 'Gennemgået';
		}

		return status || 'Ukendt status';
	}

	function getStatusClass(status) {
		if (status === 'ny') {
			return 'bg-yellow-50 text-yellow-800 border-yellow-200';
		}

		if (status === 'besvaret') {
			return 'bg-green-50 text-green-700 border-green-200';
		}

		if (status === 'gennemgået') {
			return 'bg-[#eef4f8] text-[#063b68] border-[#9ec1dc]';
		}

		return 'bg-gray-50 text-gray-700 border-gray-200';
	}

	function openCreateForm() {
		showCreateForm = true;
		showPreview = true;
		message = '';
		messageType = '';
		errorMessage = '';
	}

	function closeCreateForm() {
		showCreateForm = false;
		showPreview = true;
		newTitle = 'Symptomspørgeskema';
		newDescription =
			'Udfyld spørgeskemaet med dine aktuelle øjensymptomer, så afdelingen kan få et bedre overblik.';
		selectedQuestions = defaultQuestions.map((question) => ({ ...question }));
	}

	function toggleQuestion(questionId) {
		selectedQuestions = selectedQuestions.map((question) => {
			if (question.id === questionId) {
				return {
					...question,
					selected: !question.selected
				};
			}

			return question;
		});
	}

	function updateQuestionLabel(questionId, value) {
		selectedQuestions = selectedQuestions.map((question) => {
			if (question.id === questionId) {
				return {
					...question,
					label: value
				};
			}

			return question;
		});
	}

	function toggleQuestionRequired(questionId) {
		selectedQuestions = selectedQuestions.map((question) => {
			if (question.id === questionId) {
				return {
					...question,
					required: !question.required
				};
			}

			return question;
		});
	}

	function canCreateQuestionnaire() {
		return newTitle.trim() !== '' && getSelectedQuestions().length > 0;
	}

	async function createQuestionnaire() {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!canCreateQuestionnaire()) {
			errorMessage = 'Udfyld titel og vælg mindst ét spørgsmål.';
			return;
		}

		try {
			const questionsToSave = getSelectedQuestions().map((question) => {
				return {
					id: question.id,
					label: question.label,
					type: question.type,
					required: question.required
				};
			});

			const response = await fetch('/api/questionnaires?cpr=' + encodeURIComponent(targetCpr), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					title: newTitle,
					description: newDescription,
					questions: questionsToSave
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Spørgeskemaet kunne ikke oprettes.';
				return;
			}

			message = data.message || 'Spørgeskemaet er oprettet for patienten.';
			messageType = 'success';

			closeCreateForm();
			await loadQuestionnaires();
		} catch {
			errorMessage = 'Der opstod en fejl ved oprettelse af spørgeskemaet.';
		}
	}

	function hasLocalValue(questionnaireId, field) {
		return (
			responseForms[questionnaireId] &&
			Object.prototype.hasOwnProperty.call(responseForms[questionnaireId], field)
		);
	}

	function getResponseValue(response, camelName, snakeName) {
		if (!response) {
			return '';
		}

		const value = response[camelName] ?? response[snakeName];

		if (value === undefined || value === null) {
			return '';
		}

		return value;
	}

	function getFormValue(questionnaire, field) {
		if (hasLocalValue(questionnaire.id, field)) {
			return responseForms[questionnaire.id][field];
		}

		if (!questionnaire.response) {
			return '';
		}

		if (field === 'drynessScore') {
			return getResponseValue(questionnaire.response, 'drynessScore', 'dryness_score');
		}

		if (field === 'rednessScore') {
			return getResponseValue(questionnaire.response, 'rednessScore', 'redness_score');
		}

		if (field === 'painScore') {
			return getResponseValue(questionnaire.response, 'painScore', 'pain_score');
		}

		if (field === 'symptomStartDate') {
			return getResponseValue(questionnaire.response, 'symptomStartDate', 'symptom_start_date');
		}

		if (field === 'patientComment') {
			return getResponseValue(questionnaire.response, 'patientComment', 'patient_comment');
		}

		return '';
	}

	function getFormBoolean(questionnaire, field) {
		if (hasLocalValue(questionnaire.id, field)) {
			return responseForms[questionnaire.id][field];
		}

		if (!questionnaire.response) {
			return false;
		}

		if (field === 'blurredVision') {
			return Boolean(
				getResponseValue(questionnaire.response, 'blurredVision', 'blurred_vision')
			);
		}

		if (field === 'lightSensitivity') {
			return Boolean(
				getResponseValue(questionnaire.response, 'lightSensitivity', 'light_sensitivity')
			);
		}

		if (field === 'burningFeeling') {
			return Boolean(
				getResponseValue(questionnaire.response, 'burningFeeling', 'burning_feeling')
			);
		}

		return false;
	}

	function setResponseField(questionnaireId, field, value) {
		responseForms = {
			...responseForms,
			[questionnaireId]: {
				...(responseForms[questionnaireId] || {}),
				[field]: value
			}
		};
	}

	function canSubmitResponse(questionnaire) {
		const questions = getQuestionnaireQuestions(questionnaire);

		for (const question of questions) {
			if (!question.required) {
				continue;
			}

			if (question.type === 'score' || question.type === 'date' || question.type === 'textarea') {
				if (getFormValue(questionnaire, question.id) === '') {
					return false;
				}
			}
		}

		return true;
	}

	async function submitResponse(questionnaire) {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!canSubmitResponse(questionnaire)) {
			errorMessage = 'Udfyld alle obligatoriske felter.';
			return;
		}

		try {
			const response = await fetch('/api/questionnaires', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: questionnaire.id,
					action: 'submit-response',
					drynessScore: getFormValue(questionnaire, 'drynessScore'),
					rednessScore: getFormValue(questionnaire, 'rednessScore'),
					painScore: getFormValue(questionnaire, 'painScore'),
					blurredVision: getFormBoolean(questionnaire, 'blurredVision'),
					lightSensitivity: getFormBoolean(questionnaire, 'lightSensitivity'),
					burningFeeling: getFormBoolean(questionnaire, 'burningFeeling'),
					symptomStartDate: getFormValue(questionnaire, 'symptomStartDate'),
					patientComment: getFormValue(questionnaire, 'patientComment')
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Spørgeskemaet kunne ikke indsendes.';
				return;
			}

			message = data.message || 'Spørgeskemaet er indsendt til afdelingen.';
			messageType = 'success';

			responseForms = {
				...responseForms,
				[questionnaire.id]: {}
			};

			await loadQuestionnaires();
		} catch {
			errorMessage = 'Der opstod en fejl ved indsendelse af spørgeskemaet.';
		}
	}

	async function reviewQuestionnaire(questionnaire) {
		message = '';
		messageType = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/questionnaires?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: questionnaire.id,
					cpr: targetCpr,
					action: 'review'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Spørgeskemaet kunne ikke markeres som gennemgået.';
				return;
			}

			message = data.message || 'Spørgeskemaet er markeret som gennemgået.';
			messageType = 'success';

			await loadQuestionnaires();
		} catch {
			errorMessage = 'Der opstod en fejl ved gennemgang af spørgeskemaet.';
		}
	}

	async function reopenQuestionnaire(questionnaire) {
		message = '';
		messageType = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/questionnaires?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: questionnaire.id,
					cpr: targetCpr,
					action: 'reopen'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Spørgeskemaet kunne ikke genåbnes.';
				return;
			}

			message = data.message || 'Spørgeskemaet er genåbnet.';
			messageType = 'success';

			await loadQuestionnaires();
		} catch {
			errorMessage = 'Der opstod en fejl ved genåbning af spørgeskemaet.';
		}
	}

	async function deleteQuestionnaire(questionnaire) {
		message = '';
		messageType = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/questionnaires?cpr=' + encodeURIComponent(targetCpr), {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: questionnaire.id,
					cpr: targetCpr
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Spørgeskemaet kunne ikke slettes.';
				return;
			}

			message = data.message || 'Spørgeskemaet er slettet.';
			messageType = 'success';

			await loadQuestionnaires();
		} catch {
			errorMessage = 'Der opstod en fejl ved sletning af spørgeskemaet.';
		}
	}

	function getScoreText(value) {
		if (value === '' || value === null || value === undefined) {
			return 'Ikke besvaret';
		}

		return value + ' / 10';
	}

	function getYesNoText(value) {
		return value ? 'Ja' : 'Nej';
	}

	function getAnswerForQuestion(response, question) {
		if (!response) {
			return 'Ikke besvaret';
		}

		if (question.id === 'drynessScore') {
			return getScoreText(getResponseValue(response, 'drynessScore', 'dryness_score'));
		}

		if (question.id === 'rednessScore') {
			return getScoreText(getResponseValue(response, 'rednessScore', 'redness_score'));
		}

		if (question.id === 'painScore') {
			return getScoreText(getResponseValue(response, 'painScore', 'pain_score'));
		}

		if (question.id === 'blurredVision') {
			return getYesNoText(getResponseValue(response, 'blurredVision', 'blurred_vision'));
		}

		if (question.id === 'lightSensitivity') {
			return getYesNoText(getResponseValue(response, 'lightSensitivity', 'light_sensitivity'));
		}

		if (question.id === 'burningFeeling') {
			return getYesNoText(getResponseValue(response, 'burningFeeling', 'burning_feeling'));
		}

		if (question.id === 'symptomStartDate') {
			const value = getResponseValue(response, 'symptomStartDate', 'symptom_start_date');
			return value ? formatDate(value) : 'Ikke besvaret';
		}

		if (question.id === 'patientComment') {
			return getResponseValue(response, 'patientComment', 'patient_comment') || 'Ikke besvaret';
		}

		return 'Ikke besvaret';
	}
</script>

<div class="min-h-screen" style="background-color: #9ec1dc;">
	<header class="bg-[#063b68] text-white">
		<div class="px-5 pt-6 pb-4">
			<div class="grid grid-cols-3 items-center">
				<button
					class="bg-[#0b4f87] w-14 h-14 rounded-xl flex items-center justify-center shadow-md justify-self-start text-2xl hover:bg-[#083f70]"
					onclick={goBack}
					aria-label="Tilbage til dashboard"
				>
					←
				</button>

				<div class="text-center justify-self-center">
					<h1 class="text-4xl font-bold leading-8">
						Min<br />
						SP
					</h1>
					<div class="h-1 w-16 bg-white mx-auto mt-2 rounded"></div>
				</div>

				<div></div>
			</div>
		</div>
	</header>

	<main
		class="px-6 pt-8 pb-24"
		style="min-height: calc(100vh - 112px); background: linear-gradient(180deg, #e9f1f7 0%, #9ec1dc 100%);"
	>
		<div class="max-w-2xl mx-auto">
			<section class="text-center mb-7">
				{#if isDoctorView}
					<p class="text-[#063b68] text-sm font-bold uppercase tracking-wide">
						Lægevisning
					</p>
				{/if}

				<h2 class="text-[#063b68] text-4xl font-bold leading-tight mt-1">
					Spørgeskemaer
				</h2>

				<p class="text-black text-lg mt-2">
					{isDoctorView
						? 'Opret, tilpas og gennemgå patientens symptomspørgeskemaer.'
						: 'Udfyld spørgeskemaer fra afdelingen og følg dine indsendte svar.'}
				</p>
			</section>

			{#if errorMessage !== ''}
				<div class="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6">
					<p class="text-red-700 text-sm">
						{errorMessage}
					</p>
				</div>
			{/if}

			{#if message !== ''}
				<div class="bg-white rounded-2xl shadow-lg p-5 border-l-4 border-[#063b68] mb-6">
					<p class="text-[#063b68] text-xl font-bold">
						Handling gennemført
					</p>

					<p class="text-gray-700 mt-2">
						{message}
					</p>
				</div>
			{/if}

			{#if isDoctorView}
				<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
					<div class="px-6 py-5 border-b border-gray-200">
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Lægefaglig registrering
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Opret spørgeskema
						</h3>

						<p class="text-gray-600 text-sm mt-2">
							Vælg hvilke spørgsmål patienten skal besvare, og se en forhåndsvisning før oprettelse.
						</p>
					</div>

					<div class="px-6 py-5">
						{#if !showCreateForm}
							<button
								type="button"
								class="w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]"
								onclick={openCreateForm}
							>
								Opret nyt spørgeskema
							</button>
						{:else}
							<div class="space-y-6">
								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Titel
									</label>

									<input
										type="text"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Fx Symptomspørgeskema"
										bind:value={newTitle}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Beskrivelse til patient
									</label>

									<textarea
										class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Skriv kort hvad patienten skal udfylde."
										bind:value={newDescription}
									></textarea>
								</div>

								<div class="bg-[#eef4f8] rounded-2xl px-5 py-5">
									<h4 class="text-[#063b68] text-xl font-bold">
										Vælg og tilpas spørgsmål
									</h4>

									<p class="text-gray-600 text-sm mt-2">
										Lægen kan fjerne spørgsmål, ændre formuleringen og vælge om et spørgsmål er obligatorisk.
									</p>

									<div class="space-y-4 mt-5">
										{#each selectedQuestions as question}
											<div class="bg-white rounded-xl px-4 py-4">
												<label class="flex items-start gap-3">
													<input
														type="checkbox"
														checked={question.selected}
														onchange={() => toggleQuestion(question.id)}
														class="mt-1"
													/>

													<div class="flex-1">
														<p class="text-[#063b68] text-sm font-bold">
															{question.type === 'score'
																? 'Skala 0-10'
																: question.type === 'boolean'
																	? 'Ja/nej'
																	: question.type === 'date'
																		? 'Dato'
																		: 'Fritekst'}
														</p>

														<input
															type="text"
															class="w-full mt-2 px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:border-[#063b68]"
															value={question.label}
															oninput={(event) => updateQuestionLabel(question.id, event.target.value)}
														/>

														<label class="flex items-center gap-2 mt-3">
															<input
																type="checkbox"
																checked={question.required}
																onchange={() => toggleQuestionRequired(question.id)}
															/>

															<span class="text-gray-600 text-sm">
																Obligatorisk
															</span>
														</label>
													</div>
												</label>
											</div>
										{/each}
									</div>
								</div>

								<div>
									<button
										type="button"
										class="w-full bg-[#eef4f8] text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#dcecf7]"
										onclick={() => (showPreview = !showPreview)}
									>
										{showPreview ? 'Skjul forhåndsvisning' : 'Vis forhåndsvisning som patient'}
									</button>
								</div>

								{#if showPreview}
									<div class="bg-white border border-[#9ec1dc] rounded-2xl px-5 py-5">
										<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
											Forhåndsvisning som patient
										</p>

										<h4 class="text-black text-2xl font-bold mt-1">
											{newTitle}
										</h4>

										{#if newDescription}
											<p class="text-gray-700 text-sm mt-2 leading-relaxed">
												{newDescription}
											</p>
										{/if}

										<div class="mt-5 space-y-4">
											{#if getSelectedQuestions().length === 0}
												<p class="text-red-700 text-sm font-bold">
													Der er ikke valgt nogen spørgsmål.
												</p>
											{:else}
												{#each getSelectedQuestions() as question}
													<div>
														<label class="block text-[#063b68] font-bold mb-2">
															{question.label}
															{#if question.required}
																<span class="text-red-600">*</span>
															{/if}
														</label>

														{#if question.type === 'score'}
															<input
																type="number"
																min="0"
																max="10"
																disabled
																placeholder="0-10"
																class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-gray-50"
															/>
														{:else if question.type === 'boolean'}
															<label class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
																<input type="checkbox" disabled />
																<span class="text-gray-700 text-sm font-semibold">
																	Ja
																</span>
															</label>
														{:else if question.type === 'date'}
															<input
																type="date"
																disabled
																class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-gray-50"
															/>
														{:else}
															<textarea
																disabled
																class="w-full min-h-24 px-4 py-3 rounded-xl border border-gray-300 text-base bg-gray-50"
																placeholder="Patienten kan skrive svar her."
															></textarea>
														{/if}
													</div>
												{/each}
											{/if}
										</div>
									</div>
								{/if}

								<div class="grid grid-cols-2 gap-3">
									<button
										type="button"
										class="w-full bg-[#eef4f8] text-[#063b68] py-4 rounded-xl text-lg font-bold hover:bg-[#dcecf7]"
										onclick={closeCreateForm}
									>
										Annuller
									</button>

									<button
										type="button"
										class={canCreateQuestionnaire()
											? 'w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]'
											: 'w-full bg-gray-300 text-gray-600 py-4 rounded-xl text-lg font-bold cursor-not-allowed'}
										onclick={createQuestionnaire}
										disabled={!canCreateQuestionnaire()}
									>
										Gem spørgeskema
									</button>
								</div>
							</div>
						{/if}
					</div>
				</section>
			{/if}

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Afventer
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						{isDoctorView ? 'Spørgeskemaer der afventer svar' : 'Spørgeskemaer til udfyldelse'}
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						{isDoctorView
							? 'Her vises spørgeskemaer, som patienten endnu ikke har besvaret.'
							: 'Her kan du udfylde spørgeskemaer fra afdelingen.'}
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser spørgeskemaer...
						</h4>
					</div>
				{:else if getOpenQuestionnaires().length === 0}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen spørgeskemaer der afventer svar
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er ingen spørgeskemaer, der skal udfyldes lige nu.
						</p>
					</div>
				{:else}
					{#each getOpenQuestionnaires() as questionnaire}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h4 class="text-[#063b68] text-xl font-bold">
										{questionnaire.title}
									</h4>

									{#if questionnaire.description}
										<p class="text-gray-700 text-sm mt-2 leading-relaxed">
											{questionnaire.description}
										</p>
									{/if}

									{#if questionnaire.createdAt}
										<p class="text-gray-500 text-xs mt-2">
											Oprettet: {formatDateTime(questionnaire.createdAt)}
										</p>
									{/if}
								</div>

								<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(questionnaire.status)}>
									{getStatusText(questionnaire.status)}
								</div>
							</div>

							{#if isDoctorView}
								<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
									<p class="text-[#063b68] text-sm font-bold">
										Valgte spørgsmål
									</p>

									<div class="mt-2 space-y-1">
										{#each getQuestionnaireQuestions(questionnaire) as question}
											<p class="text-gray-700 text-sm">
												{question.label}
												{#if question.required}
													<span class="text-red-600">*</span>
												{/if}
											</p>
										{/each}
									</div>
								</div>

								<div class="mt-5">
									<button
										type="button"
										class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
										onclick={() => deleteQuestionnaire(questionnaire)}
									>
										Slet spørgeskema
									</button>
								</div>
							{:else}
								<div class="mt-5 bg-[#eef4f8] rounded-2xl px-5 py-5 space-y-5">
									{#each getQuestionnaireQuestions(questionnaire) as question}
										<div>
											<label class="block text-[#063b68] font-bold mb-2">
												{question.label}
												{#if question.required}
													<span class="text-red-600">*</span>
												{/if}
											</label>

											{#if question.type === 'score'}
												<input
													type="number"
													min="0"
													max="10"
													class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
													value={getFormValue(questionnaire, question.id)}
													oninput={(event) =>
														setResponseField(questionnaire.id, question.id, event.target.value)}
												/>
											{:else if question.type === 'boolean'}
												<label class="flex items-center gap-3 bg-white rounded-xl px-4 py-3">
													<input
														type="checkbox"
														checked={getFormBoolean(questionnaire, question.id)}
														onchange={(event) =>
															setResponseField(
																questionnaire.id,
																question.id,
																event.currentTarget.checked
															)}
													/>

													<span class="text-gray-700 text-sm font-semibold">
														Ja
													</span>
												</label>
											{:else if question.type === 'date'}
												<input
													type="date"
													class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
													value={getFormValue(questionnaire, question.id)}
													oninput={(event) =>
														setResponseField(questionnaire.id, question.id, event.target.value)}
												/>
											{:else}
												<textarea
													class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
													placeholder="Skriv eventuelt en kort kommentar."
													value={getFormValue(questionnaire, question.id)}
													oninput={(event) =>
														setResponseField(questionnaire.id, question.id, event.target.value)}
												></textarea>
											{/if}
										</div>
									{/each}

									<button
										type="button"
										class={canSubmitResponse(questionnaire)
											? 'w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]'
											: 'w-full bg-gray-300 text-gray-600 py-3 rounded-xl font-bold cursor-not-allowed'}
										onclick={() => submitResponse(questionnaire)}
										disabled={!canSubmitResponse(questionnaire)}
									>
										Indsend spørgeskema
									</button>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Indsendt
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Besvarede spørgeskemaer
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						{isDoctorView
							? 'Her kan lægen se patientens indsendte symptomsvar.'
							: 'Her kan du se spørgeskemaer, du har indsendt til afdelingen.'}
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser besvarede spørgeskemaer...
						</h4>
					</div>
				{:else if getAnsweredQuestionnaires().length === 0}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen besvarede spørgeskemaer
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er endnu ikke indsendt nogen spørgeskemaer.
						</p>
					</div>
				{:else}
					{#each getAnsweredQuestionnaires() as questionnaire}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h4 class="text-[#063b68] text-xl font-bold">
										{questionnaire.title}
									</h4>

									{#if questionnaire.response?.submittedAt || questionnaire.response?.submitted_at}
										<p class="text-gray-500 text-xs mt-2">
											Indsendt: {formatDateTime(
												questionnaire.response.submittedAt || questionnaire.response.submitted_at
											)}
										</p>
									{/if}
								</div>

								<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(questionnaire.status)}>
									{getStatusText(questionnaire.status)}
								</div>
							</div>

							{#if questionnaire.response}
								<div class="mt-4 grid grid-cols-1 gap-3">
									{#each getQuestionnaireQuestions(questionnaire) as question}
										<div class="bg-[#f3f8fc] rounded-xl px-4 py-3">
											<p class="text-[#063b68] text-sm font-bold">
												{question.label}
											</p>

											<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
												{getAnswerForQuestion(questionnaire.response, question)}
											</p>
										</div>
									{/each}
								</div>
							{/if}

							{#if isDoctorView}
								<div class="mt-5 grid grid-cols-1 gap-3">
									<button
										type="button"
										class="w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]"
										onclick={() => reviewQuestionnaire(questionnaire)}
									>
										Marker som gennemgået
									</button>

									<button
										type="button"
										class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
										onclick={() => deleteQuestionnaire(questionnaire)}
									>
										Slet spørgeskema
									</button>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Historik
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Gennemgåede spørgeskemaer
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						Her vises spørgeskemaer, som lægen har markeret som gennemgået.
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser historik...
						</h4>
					</div>
				{:else if getReviewedQuestionnaires().length === 0}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen gennemgåede spørgeskemaer
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er endnu ikke markeret nogen spørgeskemaer som gennemgået.
						</p>
					</div>
				{:else}
					{#each getReviewedQuestionnaires() as questionnaire}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h4 class="text-[#063b68] text-xl font-bold">
										{questionnaire.title}
									</h4>

									{#if questionnaire.reviewedAt || questionnaire.reviewed_at}
										<p class="text-gray-500 text-xs mt-2">
											Gennemgået: {formatDateTime(questionnaire.reviewedAt || questionnaire.reviewed_at)}
										</p>
									{/if}
								</div>

								<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(questionnaire.status)}>
									{getStatusText(questionnaire.status)}
								</div>
							</div>

							{#if questionnaire.response}
								<div class="mt-4 grid grid-cols-1 gap-3">
									{#each getQuestionnaireQuestions(questionnaire) as question}
										<div class="bg-[#f3f8fc] rounded-xl px-4 py-3">
											<p class="text-[#063b68] text-sm font-bold">
												{question.label}
											</p>

											<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
												{getAnswerForQuestion(questionnaire.response, question)}
											</p>
										</div>
									{/each}
								</div>
							{/if}

							{#if isDoctorView}
								<div class="mt-5 grid grid-cols-1 gap-3">
									<button
										type="button"
										class="w-full bg-[#eef4f8] text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#dcecf7]"
										onclick={() => reopenQuestionnaire(questionnaire)}
									>
										Genåbn spørgeskema
									</button>

									<button
										type="button"
										class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
										onclick={() => deleteQuestionnaire(questionnaire)}
									>
										Slet spørgeskema
									</button>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</section>
		</div>
	</main>
</div>