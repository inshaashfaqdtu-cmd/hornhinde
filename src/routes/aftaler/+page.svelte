<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let openSection = $state('');
	let loading = $state(true);
	let errorMessage = $state('');
	let message = $state('');
	let messageType = $state('');

	let targetCpr = $state('');
	let isDoctorView = $state(false);

	let upcomingAppointments = $state([]);
	let previousVisits = $state([]);

	let editingNotesAppointmentId = $state(null);
	let noteVisitSummary = $state('');
	let noteJournalNote = $state('');

	onMount(async () => {
		const searchParams = new URLSearchParams(window.location.search);
		targetCpr = searchParams.get('cpr') || '';
		isDoctorView = targetCpr !== '';

		await loadAppointments();
	});

	async function loadAppointments() {
		loading = true;
		errorMessage = '';

		try {
			const endpoint =
				targetCpr !== ''
					? '/api/appointments?cpr=' + encodeURIComponent(targetCpr)
					: '/api/appointments';

			const response = await fetch(endpoint);
			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Aftaler kunne ikke hentes.';
				loading = false;
				return;
			}

			const appointments = data.appointments || [];

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			upcomingAppointments = appointments
				.filter((appointment) => {
					const appointmentDate = new Date(appointment.date);
					appointmentDate.setHours(0, 0, 0, 0);

					return appointment.status === 'kommende' && appointmentDate >= today;
				})
				.sort((a, b) => new Date(a.date) - new Date(b.date));

			previousVisits = appointments
				.filter((appointment) => {
					const appointmentDate = new Date(appointment.date);
					appointmentDate.setHours(0, 0, 0, 0);

					return (
						appointment.status === 'afholdt' ||
						appointment.status === 'aflyst' ||
						appointmentDate < today
					);
				})
				.sort((a, b) => new Date(b.date) - new Date(a.date));
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

	function toggleSection(sectionId) {
		openSection = openSection === sectionId ? '' : sectionId;
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

	function getDay(dateValue) {
		if (!dateValue) {
			return '';
		}

		return new Date(dateValue).toLocaleDateString('da-DK', {
			day: 'numeric'
		});
	}

	function getMonth(dateValue) {
		if (!dateValue) {
			return '';
		}

		return new Date(dateValue).toLocaleDateString('da-DK', {
			month: 'short'
		});
	}

	function getYear(dateValue) {
		if (!dateValue) {
			return '';
		}

		return new Date(dateValue).toLocaleDateString('da-DK', {
			year: 'numeric'
		});
	}

	function isPastDate(dateValue) {
		if (!dateValue) {
			return false;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const appointmentDate = new Date(dateValue);
		appointmentDate.setHours(0, 0, 0, 0);

		return appointmentDate < today;
	}

	function getAppointmentDisplayStatus(appointment) {
		if (appointment.status === 'aflyst') {
			return 'aflyst';
		}

		if (appointment.status === 'afholdt') {
			return 'afholdt';
		}

		if (isPastDate(appointment.date)) {
			return 'tidligere';
		}

		return appointment.status || 'ukendt';
	}

	function getVisitSummary(visit) {
		if (visit.status === 'aflyst') {
			return 'Aftalen er aflyst. Der er derfor ikke registreret et besøgssammendrag.';
		}

		return (
			visit.visitSummary ||
			visit.visit_summary ||
			'Der er ikke registreret et besøgssammendrag for dette besøg endnu.'
		);
	}

	function getJournalNote(visit) {
		if (visit.status === 'aflyst') {
			return 'Aftalen er aflyst. Der er derfor ikke registreret journalnotater.';
		}

		return (
			visit.journalNote ||
			visit.journal_note ||
			'Der er ikke registreret journalnotater for dette besøg endnu.'
		);
	}

	function getStatusText(status) {
		if (status === 'kommende') {
			return 'Kommende';
		}

		if (status === 'afholdt') {
			return 'Afholdt';
		}

		if (status === 'tidligere') {
			return 'Tidligere';
		}

		if (status === 'aflyst') {
			return 'Aflyst';
		}

		return status || 'Ukendt status';
	}

	function getStatusClass(status) {
		if (status === 'kommende') {
			return 'bg-[#eef4f8] text-[#063b68] border-[#9ec1dc]';
		}

		if (status === 'afholdt') {
			return 'bg-green-50 text-green-700 border-green-200';
		}

		if (status === 'tidligere') {
			return 'bg-gray-50 text-gray-700 border-gray-200';
		}

		if (status === 'aflyst') {
			return 'bg-red-50 text-red-700 border-red-200';
		}

		return 'bg-gray-50 text-gray-700 border-gray-200';
	}

	function getVisitTypeText(visit) {
		if (visit.status === 'aflyst') {
			return 'Aflyst aftale';
		}

		if (visit.status === 'afholdt') {
			return 'Afholdt besøg';
		}

		if (isPastDate(visit.date)) {
			return 'Tidligere aftale';
		}

		return 'Tidligere besøg';
	}

	function startNotesForm(appointment) {
		editingNotesAppointmentId = appointment.id;
		noteVisitSummary = appointment.visitSummary || appointment.visit_summary || '';
		noteJournalNote = appointment.journalNote || appointment.journal_note || '';
		message = '';
		messageType = '';
		errorMessage = '';
	}

	function cancelNotesForm() {
		editingNotesAppointmentId = null;
		noteVisitSummary = '';
		noteJournalNote = '';
	}

	async function saveNotes(appointment) {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!noteVisitSummary.trim() && !noteJournalNote.trim()) {
			errorMessage = 'Udfyld enten besøgssammendrag eller journalnotat.';
			return;
		}

		try {
			const response = await fetch('/api/appointments?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: appointment.id,
					cpr: targetCpr,
					action: 'save-notes',
					visitSummary: noteVisitSummary,
					journalNote: noteJournalNote
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Journalnotatet kunne ikke gemmes.';
				return;
			}

			message = data.message || 'Besøgssammendrag og journalnotat er gemt.';
			messageType = 'success';

			cancelNotesForm();
			await loadAppointments();
		} catch {
			errorMessage = 'Der opstod en fejl ved gemning af journalnotatet.';
		}
	}

	async function cancelAppointment(appointment) {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!isDoctorView) {
			errorMessage = 'Kun lægen kan aflyse aftaler.';
			return;
		}

		try {
			const response = await fetch('/api/appointments?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: appointment.id,
					cpr: targetCpr,
					action: 'cancel'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Aftalen kunne ikke aflyses.';
				return;
			}

			message =
				data.message ||
				'Aftalen er aflyst, og den tilknyttede bookinganmodning er annulleret.';
			messageType = 'success';

			await loadAppointments();
		} catch {
			errorMessage = 'Der opstod en fejl ved aflysning af aftalen.';
		}
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
					Aftaler og journalnotater
				</h2>

				<p class="text-black text-lg mt-2">
					{isDoctorView
						? 'Se patientens aftaler, besøgssammendrag og journalnotater.'
						: 'Se dine aftaler, besøgssammendrag og journalnotater.'}
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

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Kommende
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Aftaler
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						Her vises kun aftaler, som er bekræftet og stadig kommende.
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser aftaler...
						</h4>
					</div>
				{:else if upcomingAppointments.length === 0}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen kommende aftaler
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er endnu ikke registreret kommende aftaler.
						</p>
					</div>
				{:else}
					{#each upcomingAppointments as appointment}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="text-[#063b68] text-sm uppercase tracking-wide font-semibold">
										Kommende aftale
									</p>

									<h4 class="text-black text-xl font-bold mt-1">
										{appointment.title}
									</h4>

									<p class="text-gray-700 text-sm mt-1">
										{formatDate(appointment.date)}
										{#if appointment.time}
											kl. {appointment.time}
										{/if}
									</p>

									{#if appointment.location}
										<p class="text-gray-500 text-sm mt-1">
											{appointment.location}
										</p>
									{/if}
								</div>

								<div
									class={'border rounded-xl px-3 py-2 text-xs font-bold ' +
										getStatusClass(getAppointmentDisplayStatus(appointment))}
								>
									{getStatusText(getAppointmentDisplayStatus(appointment))}
								</div>
							</div>

							{#if isDoctorView}
								<div class="mt-5 grid grid-cols-1 gap-3">
									<button
										type="button"
										class="w-full bg-[#eef4f8] text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#dcecf7]"
										onclick={() => startNotesForm(appointment)}
									>
										Opret/rediger besøgssammendrag og journalnotat
									</button>

									<button
										type="button"
										class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
										onclick={() => cancelAppointment(appointment)}
									>
										Aflys aftale
									</button>
								</div>
							{/if}

							{#if editingNotesAppointmentId === appointment.id}
								<div class="mt-5 bg-[#eef4f8] rounded-2xl px-5 py-5 space-y-4">
									<div>
										<label class="block text-[#063b68] font-bold mb-2">
											Besøgssammendrag
										</label>

										<textarea
											class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
											placeholder="Skriv kort, hvad der blev gennemgået ved besøget."
											bind:value={noteVisitSummary}
										></textarea>
									</div>

									<div>
										<label class="block text-[#063b68] font-bold mb-2">
											Journalnotat
										</label>

										<textarea
											class="w-full min-h-32 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
											placeholder="Skriv journalnotat fra konsultationen."
											bind:value={noteJournalNote}
										></textarea>
									</div>

									<div class="grid grid-cols-2 gap-3">
										<button
											type="button"
											class="w-full bg-white text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#f8fbfd]"
											onclick={cancelNotesForm}
										>
											Annuller
										</button>

										<button
											type="button"
											class="w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]"
											onclick={() => saveNotes(appointment)}
										>
											Gem notater
										</button>
									</div>
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
						Tidligere, afholdte og aflyste aftaler
					</h3>

					<p class="text-gray-600 text-sm mt-2">
						Her vises aftaler, der er afholdt, tidligere eller aflyst.
					</p>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser historik...
						</h4>
					</div>
				{:else if previousVisits.length === 0}
					<div class="px-6 py-12 text-center">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen tidligere, afholdte eller aflyste aftaler
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed">
							Der er endnu ikke registreret tidligere, afholdte eller aflyste aftaler.
						</p>
					</div>
				{:else}
					{#each previousVisits as visit}
						<div class="border-b border-gray-200 last:border-b-0">
							<div class="px-6 py-6 flex items-start gap-5">
								<div
									class="w-16 h-20 rounded-2xl bg-[#eef4f8] flex flex-col items-center justify-center text-[#063b68] font-bold shrink-0"
								>
									<span class="text-2xl leading-none">{getDay(visit.date)}</span>
									<span class="text-sm uppercase mt-1">{getMonth(visit.date)}</span>
									<span class="text-sm">{getYear(visit.date)}</span>
								</div>

								<div class="flex-1">
									<div class="flex items-start justify-between gap-4">
										<div>
											<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
												{getVisitTypeText(visit)}
											</p>

											<h4 class="text-black text-2xl font-bold mt-1">
												{visit.title}
											</h4>

											{#if visit.time}
												<p class="text-gray-700 text-sm mt-1">
													kl. {visit.time}
												</p>
											{/if}

											{#if visit.location}
												<p class="text-gray-700 text-lg mt-1">
													{visit.location}
												</p>
											{/if}
										</div>

										<div
											class={'border rounded-xl px-3 py-2 text-xs font-bold ' +
												getStatusClass(getAppointmentDisplayStatus(visit))}
										>
											{getStatusText(getAppointmentDisplayStatus(visit))}
										</div>
									</div>
								</div>
							</div>

							{#if isDoctorView && visit.status !== 'aflyst'}
								<div class="px-6 pb-5">
									<button
										type="button"
										class="w-full bg-[#eef4f8] text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#dcecf7]"
										onclick={() => startNotesForm(visit)}
									>
										Opret/rediger besøgssammendrag og journalnotat
									</button>
								</div>
							{/if}

							{#if editingNotesAppointmentId === visit.id}
								<div class="px-6 pb-5">
									<div class="bg-[#eef4f8] rounded-2xl px-5 py-5 space-y-4">
										<div>
											<label class="block text-[#063b68] font-bold mb-2">
												Besøgssammendrag
											</label>

											<textarea
												class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
												placeholder="Skriv kort, hvad der blev gennemgået ved besøget."
												bind:value={noteVisitSummary}
											></textarea>
										</div>

										<div>
											<label class="block text-[#063b68] font-bold mb-2">
												Journalnotat
											</label>

											<textarea
												class="w-full min-h-32 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
												placeholder="Skriv journalnotat fra konsultationen."
												bind:value={noteJournalNote}
											></textarea>
										</div>

										<div class="grid grid-cols-2 gap-3">
											<button
												type="button"
												class="w-full bg-white text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#f8fbfd]"
												onclick={cancelNotesForm}
											>
												Annuller
											</button>

											<button
												type="button"
												class="w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]"
												onclick={() => saveNotes(visit)}
											>
												Gem notater
											</button>
										</div>
									</div>
								</div>
							{/if}

							<div class="border-t border-gray-200">
								<button
									class="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#f3f8fc] transition"
									onclick={() => toggleSection('summary-' + visit.id)}
								>
									<div>
										<p class="text-[#063b68] text-xl font-bold">
											Besøgssammendrag
										</p>

										<p class="text-gray-500 text-sm mt-1">
											Se et kort overblik over besøget eller aftalestatus
										</p>
									</div>

									<span class="text-[#063b68] text-3xl">
										{openSection === 'summary-' + visit.id ? '−' : '+'}
									</span>
								</button>

								{#if openSection === 'summary-' + visit.id}
									<div class="px-6 pb-5">
										<div class="ml-4 border-l-4 border-[#063b68] bg-[#f3f8fc] rounded-r-xl px-4 py-3">
											<h5 class="text-[#063b68] text-base font-bold mb-1">
												Besøgssammendrag
											</h5>

											<p class="text-gray-700 text-sm leading-relaxed">
												{getVisitSummary(visit)}
											</p>
										</div>
									</div>
								{/if}
							</div>

							<div class="border-t border-gray-200">
								<button
									class="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#f3f8fc] transition"
									onclick={() => toggleSection('notes-' + visit.id)}
								>
									<div>
										<p class="text-[#063b68] text-xl font-bold">
											Journalnotater
										</p>

										<p class="text-gray-500 text-sm mt-1">
											Læs notater fra konsultationen eller aftalestatus
										</p>
									</div>

									<span class="text-[#063b68] text-3xl">
										{openSection === 'notes-' + visit.id ? '−' : '+'}
									</span>
								</button>

								{#if openSection === 'notes-' + visit.id}
									<div class="px-6 pb-5">
										<div class="ml-4 border-l-4 border-[#063b68] bg-[#f3f8fc] rounded-r-xl px-4 py-3">
											<h5 class="text-[#063b68] text-base font-bold mb-1">
												Journalnotat
											</h5>

											<p class="text-gray-700 text-sm leading-relaxed">
												{getJournalNote(visit)}
											</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</section>
		</div>
	</main>
</div>