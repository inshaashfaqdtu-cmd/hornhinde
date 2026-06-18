<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let loading = $state(true);
	let errorMessage = $state('');
	let message = $state('');
	let messageType = $state('');

	let targetCpr = $state('');
	let isDoctorView = $state(false);

	let tasks = $state([]);

	let showCreateForm = $state(false);
	let newTitle = $state('');
	let newDueDate = $state('');
	let newNote = $state('');

	let submissionComments = $state({});
	let selectedFilesByTask = $state({});
	let doctorReplies = $state({});

	onMount(async () => {
		const searchParams = new URLSearchParams(window.location.search);
		targetCpr = searchParams.get('cpr') || '';
		isDoctorView = targetCpr !== '';

		await loadTasks();
	});

	async function loadTasks() {
		loading = true;
		errorMessage = '';

		try {
			const endpoint =
				targetCpr !== ''
					? '/api/tasks?cpr=' + encodeURIComponent(targetCpr)
					: '/api/tasks';

			const response = await fetch(endpoint);
			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Opgaver kunne ikke hentes.';
				loading = false;
				return;
			}

			tasks = data.tasks || [];

			tasks = tasks.sort((a, b) => {
				if (a.isDone !== b.isDone) {
					return a.isDone ? 1 : -1;
				}

				return new Date(a.dueDate) - new Date(b.dueDate);
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

	function getActiveTasks() {
		return tasks.filter((task) => !task.isDone);
	}

	function getSubmittedTasks() {
		return tasks.filter((task) => task.isDone);
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

	function isOverdue(task) {
		if (!task.dueDate || task.isDone) {
			return false;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const dueDate = new Date(task.dueDate);
		dueDate.setHours(0, 0, 0, 0);

		return dueDate < today;
	}

	function getStatusText(task) {
		if (task.isDone && task.doctorReply) {
			return 'Besvaret';
		}

		if (task.isDone) {
			return 'Indsendt';
		}

		if (isOverdue(task)) {
			return 'Overskredet';
		}

		return 'Afventer';
	}

	function getStatusClass(task) {
		if (task.isDone && task.doctorReply) {
			return 'bg-[#eef4f8] text-[#063b68] border-[#9ec1dc]';
		}

		if (task.isDone) {
			return 'bg-green-50 text-green-700 border-green-200';
		}

		if (isOverdue(task)) {
			return 'bg-red-50 text-red-700 border-red-200';
		}

		return 'bg-yellow-50 text-yellow-800 border-yellow-200';
	}

	function openCreateForm() {
		showCreateForm = true;
		message = '';
		messageType = '';
		errorMessage = '';
	}

	function closeCreateForm() {
		showCreateForm = false;
		newTitle = '';
		newDueDate = '';
		newNote = '';
	}

	function canCreateTask() {
		return newTitle.trim() !== '' && newDueDate !== '';
	}

	async function createTask() {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!canCreateTask()) {
			errorMessage = 'Udfyld opgavetitel og frist.';
			return;
		}

		try {
			const response = await fetch('/api/tasks?cpr=' + encodeURIComponent(targetCpr), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					title: newTitle,
					dueDate: newDueDate,
					note: newNote
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Opgaven kunne ikke oprettes.';
				return;
			}

			message = data.message || 'Opgaven er oprettet for patienten.';
			messageType = 'success';

			closeCreateForm();
			await loadTasks();
		} catch {
			errorMessage = 'Der opstod en fejl ved oprettelse af opgaven.';
		}
	}

	function getTaskFiles(taskId) {
		return selectedFilesByTask[taskId] || [];
	}

	function handleTaskFileUpload(event, taskId) {
		const input = event.currentTarget;
		const files = Array.from(input.files || []);

		if (files.length === 0) {
			return;
		}

		const existingFiles = getTaskFiles(taskId);
		const existingFileKeys = existingFiles.map((file) => file.name + '-' + file.size);

		const newFiles = files.filter((file) => {
			const fileKey = file.name + '-' + file.size;
			return !existingFileKeys.includes(fileKey);
		});

		selectedFilesByTask = {
			...selectedFilesByTask,
			[taskId]: [...existingFiles, ...newFiles]
		};

		input.value = '';
	}

	function removeTaskFile(taskId, index) {
		const existingFiles = getTaskFiles(taskId);

		selectedFilesByTask = {
			...selectedFilesByTask,
			[taskId]: existingFiles.filter((_, fileIndex) => fileIndex !== index)
		};
	}

	function setSubmissionComment(taskId, value) {
		submissionComments = {
			...submissionComments,
			[taskId]: value
		};
	}

	function getSubmissionComment(taskId) {
		return submissionComments[taskId] || '';
	}

	function canSubmitTask(taskId) {
		const files = getTaskFiles(taskId);
		const comment = getSubmissionComment(taskId);

		return files.length > 0 || comment.trim() !== '';
	}

	async function submitTask(task) {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!canSubmitTask(task.id)) {
			errorMessage = 'Vedhæft mindst ét billede/dokument eller skriv en kort kommentar.';
			return;
		}

		try {
			const formData = new FormData();

			formData.append('id', task.id);
			formData.append('submissionComment', getSubmissionComment(task.id));

			for (const file of getTaskFiles(task.id)) {
				formData.append('files', file);
			}

			const response = await fetch('/api/tasks', {
				method: 'PATCH',
				body: formData
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Opgaven kunne ikke indsendes.';
				return;
			}

			message = data.message || 'Opgaven er indsendt.';
			messageType = 'success';

			submissionComments = {
				...submissionComments,
				[task.id]: ''
			};

			selectedFilesByTask = {
				...selectedFilesByTask,
				[task.id]: []
			};

			await loadTasks();
		} catch {
			errorMessage = 'Der opstod en fejl ved indsendelse af opgaven.';
		}
	}

	function setDoctorReply(taskId, value) {
		doctorReplies = {
			...doctorReplies,
			[taskId]: value
		};
	}

	function getDoctorReply(task) {
		if (doctorReplies[task.id] !== undefined) {
			return doctorReplies[task.id];
		}

		return task.doctorReply || '';
	}

	function canSendDoctorReply(task) {
		return getDoctorReply(task).trim() !== '';
	}

	async function sendDoctorReply(task) {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!canSendDoctorReply(task)) {
			errorMessage = 'Skriv et svar til patienten.';
			return;
		}

		try {
			const response = await fetch('/api/tasks?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: task.id,
					cpr: targetCpr,
					action: 'doctor-reply',
					doctorReply: getDoctorReply(task)
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Svaret kunne ikke gemmes.';
				return;
			}

			message = data.message || 'Svar til patientens opgave er gemt.';
			messageType = 'success';

			doctorReplies = {
				...doctorReplies,
				[task.id]: ''
			};

			await loadTasks();
		} catch {
			errorMessage = 'Der opstod en fejl ved gemning af lægens svar.';
		}
	}

	async function reopenTask(task) {
		message = '';
		messageType = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/tasks?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: task.id,
					cpr: targetCpr,
					action: 'reopen'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Opgaven kunne ikke genåbnes.';
				return;
			}

			message = data.message || 'Opgaven er genåbnet.';
			messageType = 'success';

			await loadTasks();
		} catch {
			errorMessage = 'Der opstod en fejl ved genåbning af opgaven.';
		}
	}

	async function deleteTask(task) {
		message = '';
		messageType = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/tasks?cpr=' + encodeURIComponent(targetCpr), {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: task.id,
					cpr: targetCpr
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Opgaven kunne ikke slettes.';
				return;
			}

			message = data.message || 'Opgaven er slettet.';
			messageType = 'success';

			await loadTasks();
		} catch {
			errorMessage = 'Der opstod en fejl ved sletning af opgaven.';
		}
	}

	function getSubmittedFiles(fileValue) {
		if (!fileValue) {
			return [];
		}

		return fileValue
			.split(',')
			.map((file) => file.trim())
			.filter((file) => file !== '');
	}

	function getFileName(filePath) {
		if (!filePath) {
			return 'Fil';
		}

		return filePath.split('/').pop();
	}

	function isRealUploadPath(filePath) {
		return filePath.startsWith('/uploads/');
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
					Opgaver
				</h2>

				<p class="text-black text-lg mt-2">
					{isDoctorView
						? 'Opret, følg op og skriv svar til patientens opgaver.'
						: 'Se dine opgaver, indsend filer og læs svar fra lægen.'}
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
							Lægefaglig plan
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Opret opgave til patient
						</h3>

						<p class="text-gray-600 text-sm mt-2">
							Opret en opgave, hvor patienten kan indsende billede, dokument eller kommentar.
						</p>
					</div>

					<div class="px-6 py-5">
						{#if !showCreateForm}
							<button
								type="button"
								class="w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]"
								onclick={openCreateForm}
							>
								Opret ny opgave
							</button>
						{:else}
							<div class="space-y-5">
								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Opgavetitel
									</label>

									<input
										type="text"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Fx Indsend billede af øje"
										bind:value={newTitle}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Frist
									</label>

									<input
										type="date"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										bind:value={newDueDate}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Besked til patient
									</label>

									<textarea
										class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Fx Upload et tydeligt billede af øjet i dagslys."
										bind:value={newNote}
									></textarea>
								</div>

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
										class={canCreateTask()
											? 'w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]'
											: 'w-full bg-gray-300 text-gray-600 py-4 rounded-xl text-lg font-bold cursor-not-allowed'}
										onclick={createTask}
										disabled={!canCreateTask()}
									>
										Gem opgave
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
						Aktive opgaver
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						{isDoctorView
							? 'Her vises opgaver, som patienten endnu ikke har indsendt.'
							: 'Her kan du indsende svar, billede eller dokument til hver opgave.'}
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser opgaver...
						</h4>
					</div>
				{:else if getActiveTasks().length === 0}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen aktive opgaver
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er ingen opgaver, der afventer indsendelse.
						</p>
					</div>
				{:else}
					{#each getActiveTasks() as task}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h4 class="text-[#063b68] text-xl font-bold">
										{task.title}
									</h4>

									<p class="text-gray-700 text-sm mt-2">
										Frist: {formatDate(task.dueDate)}
									</p>

									{#if task.note}
										<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
											<p class="text-[#063b68] text-sm font-bold">
												Besked fra lægen
											</p>

											<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
												{task.note}
											</p>
										</div>
									{/if}
								</div>

								<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(task)}>
									{getStatusText(task)}
								</div>
							</div>

							{#if !isDoctorView}
								<div class="mt-5 bg-[#eef4f8] rounded-2xl px-5 py-5 space-y-4">
									<div>
										<label class="block text-[#063b68] font-bold mb-2">
											Kommentar til afdelingen
										</label>

										<textarea
											class="w-full min-h-24 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
											placeholder="Skriv en kort kommentar til opgaven."
											value={getSubmissionComment(task.id)}
											oninput={(event) => setSubmissionComment(task.id, event.target.value)}
										></textarea>
									</div>

									<div>
										<input
											id={'task-file-upload-' + task.id}
											type="file"
											accept="image/*,.pdf,.doc,.docx,.heic,.heif"
											multiple
											onchange={(event) => handleTaskFileUpload(event, task.id)}
											style="display: none;"
										/>

										<label
											for={'task-file-upload-' + task.id}
											class="block border-2 border-dashed border-[#9ec1dc] rounded-xl p-5 text-center cursor-pointer bg-white hover:bg-[#f8fbfd] transition"
										>
											<p class="text-[#063b68] text-lg font-bold">
												Vedhæft billede eller dokument
											</p>

											<p class="text-gray-500 text-sm mt-1">
												Du kan vælge flere filer. Fx billede af øje, PDF eller dokument.
											</p>
										</label>

										{#if getTaskFiles(task.id).length > 0}
											<div class="mt-4 space-y-2">
												{#each getTaskFiles(task.id) as file, index}
													<div class="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3">
														<div>
															<p class="text-[#063b68] font-bold text-sm break-all">
																{file.name}
															</p>

															<p class="text-gray-500 text-xs mt-1">
																{Math.round(file.size / 1024)} KB
															</p>
														</div>

														<button
															type="button"
															class="text-red-600 text-sm font-bold hover:underline shrink-0"
															onclick={() => removeTaskFile(task.id, index)}
														>
															Fjern
														</button>
													</div>
												{/each}
											</div>
										{/if}
									</div>

									<button
										type="button"
										class={canSubmitTask(task.id)
											? 'w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]'
											: 'w-full bg-gray-300 text-gray-600 py-3 rounded-xl font-bold cursor-not-allowed'}
										onclick={() => submitTask(task)}
										disabled={!canSubmitTask(task.id)}
									>
										Indsend opgave
									</button>
								</div>
							{/if}

							{#if isDoctorView}
								<div class="mt-5">
									<button
										type="button"
										class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
										onclick={() => deleteTask(task)}
									>
										Slet opgave
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
						Indsendt
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Indsendte opgaver
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						{isDoctorView
							? 'Her kan lægen se patientens indsendte kommentarer, filer og skrive svar.'
							: 'Her kan du se de opgaver, du allerede har indsendt, samt lægens svar.'}
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser indsendte opgaver...
						</h4>
					</div>
				{:else if getSubmittedTasks().length === 0}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen indsendte opgaver
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er endnu ikke indsendt nogen opgaver.
						</p>
					</div>
				{:else}
					{#each getSubmittedTasks() as task}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h4 class="text-[#063b68] text-xl font-bold">
										{task.title}
									</h4>

									<p class="text-gray-700 text-sm mt-2">
										Frist: {formatDate(task.dueDate)}
									</p>

									{#if task.submittedAt}
										<p class="text-gray-500 text-xs mt-2">
											Indsendt: {formatDateTime(task.submittedAt)}
										</p>
									{/if}
								</div>

								<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(task)}>
									{getStatusText(task)}
								</div>
							</div>

							{#if task.note}
								<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
									<p class="text-[#063b68] text-sm font-bold">
										Opgavebesked
									</p>

									<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
										{task.note}
									</p>
								</div>
							{/if}

							{#if task.submissionComment}
								<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
									<p class="text-[#063b68] text-sm font-bold">
										Patientens kommentar
									</p>

									<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
										{task.submissionComment}
									</p>
								</div>
							{/if}

							{#if getSubmittedFiles(task.submittedFileName).length > 0}
								<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
									<p class="text-[#063b68] text-sm font-bold">
										Vedhæftede filer
									</p>

									<div class="space-y-2 mt-2">
										{#each getSubmittedFiles(task.submittedFileName) as filePath}
											{#if isRealUploadPath(filePath)}
												<a
													href={filePath}
													target="_blank"
													rel="noopener noreferrer"
													class="block bg-white rounded-xl px-4 py-3 text-[#063b68] text-sm font-bold hover:underline break-all"
												>
													Åbn fil: {getFileName(filePath)}
												</a>
											{:else}
												<div class="bg-white rounded-xl px-4 py-3">
													<p class="text-[#063b68] text-sm font-bold break-all">
														{filePath}
													</p>
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{/if}

							{#if task.doctorReply}
								<div class="mt-4 bg-[#eef4f8] rounded-xl px-4 py-3 border border-[#9ec1dc]">
									<p class="text-[#063b68] text-sm font-bold">
										Svar fra lægen
									</p>

									<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
										{task.doctorReply}
									</p>

									{#if task.doctorRepliedAt}
										<p class="text-gray-500 text-xs mt-2">
											Besvaret: {formatDateTime(task.doctorRepliedAt)}
										</p>
									{/if}
								</div>
							{/if}

							{#if isDoctorView}
								<div class="mt-5 bg-[#eef4f8] rounded-2xl px-5 py-5 space-y-4">
									<div>
										<label class="block text-[#063b68] font-bold mb-2">
											Svar til patienten
										</label>

										<textarea
											class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
											placeholder="Fx Tak for billedet. Vi vurderer, at du skal komme til kontrol."
											value={getDoctorReply(task)}
											oninput={(event) => setDoctorReply(task.id, event.target.value)}
										></textarea>
									</div>

									<button
										type="button"
										class={canSendDoctorReply(task)
											? 'w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]'
											: 'w-full bg-gray-300 text-gray-600 py-3 rounded-xl font-bold cursor-not-allowed'}
										onclick={() => sendDoctorReply(task)}
										disabled={!canSendDoctorReply(task)}
									>
										Send svar til patient
									</button>
								</div>

								<div class="mt-5 grid grid-cols-1 gap-3">
									<button
										type="button"
										class="w-full bg-[#eef4f8] text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#dcecf7]"
										onclick={() => reopenTask(task)}
									>
										Genåbn opgave
									</button>

									<button
										type="button"
										class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
										onclick={() => deleteTask(task)}
									>
										Slet opgave
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