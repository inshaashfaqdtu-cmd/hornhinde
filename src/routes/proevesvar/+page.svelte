<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let loading = $state(true);
	let errorMessage = $state('');
	let message = $state('');
	let messageType = $state('');

	let targetCpr = $state('');
	let isDoctorView = $state(false);

	let labResults = $state([]);

	let showCreateForm = $state(false);
	let newTitle = $state('');
	let newResult = $state('');
	let newReferenceRange = $state('');
	let newAssessment = $state('');
	let newDate = $state('');

	onMount(async () => {
		const searchParams = new URLSearchParams(window.location.search);
		targetCpr = searchParams.get('cpr') || '';
		isDoctorView = targetCpr !== '';

		await loadLabResults();
	});

	async function loadLabResults() {
		loading = true;
		errorMessage = '';

		try {
			const endpoint =
				targetCpr !== ''
					? '/api/lab-results?cpr=' + encodeURIComponent(targetCpr)
					: '/api/lab-results';

			const response = await fetch(endpoint);
			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Prøvesvar kunne ikke hentes.';
				loading = false;
				return;
			}

			labResults = data.results || [];

			labResults = labResults.sort((a, b) => {
				return new Date(b.date) - new Date(a.date);
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

	function openCreateForm() {
		showCreateForm = true;
		message = '';
		messageType = '';
		errorMessage = '';
	}

	function closeCreateForm() {
		showCreateForm = false;
		newTitle = '';
		newResult = '';
		newReferenceRange = '';
		newAssessment = '';
		newDate = '';
	}

	function canCreateLabResult() {
		return newTitle.trim() !== '' && newResult.trim() !== '' && newDate !== '';
	}

	async function createLabResult() {
		message = '';
		messageType = '';
		errorMessage = '';

		if (!canCreateLabResult()) {
			errorMessage = 'Udfyld prøvetype, resultat og dato.';
			return;
		}

		try {
			const response = await fetch('/api/lab-results?cpr=' + encodeURIComponent(targetCpr), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					title: newTitle,
					result: newResult,
					referenceRange: newReferenceRange,
					assessment: newAssessment,
					date: newDate
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Prøvesvaret kunne ikke oprettes.';
				return;
			}

			message = data.message || 'Prøvesvaret er oprettet for patienten.';
			messageType = 'success';

			closeCreateForm();
			await loadLabResults();
		} catch {
			errorMessage = 'Der opstod en fejl ved oprettelse af prøvesvar.';
		}
	}

	function getAssessmentText(result) {
		return result.assessment || 'Ingen lægefaglig vurdering registreret endnu.';
	}

	function getReferenceRange(result) {
		return result.referenceRange || result.reference_range || '';
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
					Prøvesvar
				</h2>

				<p class="text-black text-lg mt-2">
					{isDoctorView
						? 'Se og opret prøvesvar for patienten.'
						: 'Her kan du se dine prøvesvar, når de er tilgængelige.'}
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
							Opret prøvesvar
						</h3>

						<p class="text-gray-600 text-sm mt-2">
							Opret nye prøvesvar, som patienten efterfølgende kan se i sit overblik.
						</p>
					</div>

					<div class="px-6 py-5">
						{#if !showCreateForm}
							<button
								type="button"
								class="w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]"
								onclick={openCreateForm}
							>
								Opret nyt prøvesvar
							</button>
						{:else}
							<div class="space-y-5">
								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Prøvetype
									</label>

									<input
										type="text"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Fx Blodprøve, EKG eller Hornhindevurdering"
										bind:value={newTitle}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Dato
									</label>

									<input
										type="date"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										bind:value={newDate}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Resultat
									</label>

									<textarea
										class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Skriv prøveresultatet her."
										bind:value={newResult}
									></textarea>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Referenceområde
									</label>

									<input
										type="text"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Fx Normalområde eller forventet interval"
										bind:value={newReferenceRange}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Lægefaglig vurdering
									</label>

									<textarea
										class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Skriv kort vurdering af prøvesvaret."
										bind:value={newAssessment}
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
										class={canCreateLabResult()
											? 'w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]'
											: 'w-full bg-gray-300 text-gray-600 py-4 rounded-xl text-lg font-bold cursor-not-allowed'}
										onclick={createLabResult}
										disabled={!canCreateLabResult()}
									>
										Gem prøvesvar
									</button>
								</div>
							</div>
						{/if}
					</div>
				</section>
			{/if}

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Laboratoriesvar
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						{isDoctorView ? 'Patientens prøvesvar' : 'Dine prøvesvar'}
					</h3>
				</div>

				{#if loading}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<h4 class="text-[#063b68] text-2xl font-bold">
							Indlæser prøvesvar...
						</h4>
					</div>
				{:else if labResults.length === 0}
					<div class="px-6 py-12 text-center bg-[#eef4f8]">
						<div
							class="w-20 h-20 rounded-2xl bg-white mx-auto flex items-center justify-center text-[#063b68] text-xl font-bold"
						>
							LAB
						</div>

						<h4 class="text-[#063b68] text-2xl font-bold mt-6">
							Ingen prøvesvar endnu
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed max-w-md mx-auto">
							Der er endnu ikke registreret prøvesvar for denne patient. Når prøvesvar bliver tilgængelige i databasen, vil de blive vist her.
						</p>
					</div>
				{:else}
					{#each labResults as result}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
										Prøvesvar
									</p>

									<h4 class="text-black text-xl font-bold mt-1">
										{result.title}
									</h4>

									<p class="text-gray-500 text-sm mt-1">
										{formatDate(result.date)}
									</p>
								</div>

								<div class="bg-[#eef4f8] text-[#063b68] border border-[#9ec1dc] rounded-xl px-3 py-2 text-xs font-bold">
									Registreret
								</div>
							</div>

							<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
								<p class="text-[#063b68] text-sm font-bold">
									Resultat
								</p>

								<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
									{result.result}
								</p>
							</div>

							{#if getReferenceRange(result) !== ''}
								<div class="mt-3 bg-[#f3f8fc] rounded-xl px-4 py-3">
									<p class="text-[#063b68] text-sm font-bold">
										Referenceområde
									</p>

									<p class="text-gray-700 text-sm mt-1 leading-relaxed">
										{getReferenceRange(result)}
									</p>
								</div>
							{/if}

							<div class="mt-3 bg-[#f3f8fc] rounded-xl px-4 py-3">
								<p class="text-[#063b68] text-sm font-bold">
									Lægefaglig vurdering
								</p>

								<p class="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-line">
									{getAssessmentText(result)}
								</p>
							</div>
						</div>
					{/each}
				{/if}
			</section>

			<section class="mt-8 text-center">
				<p class="text-[#063b68] text-lg font-semibold">
					Spørgsmål til dine prøvesvar?
				</p>

				<p class="text-black mt-2">
					Kontakt afdelingen, hvis du er i tvivl om betydningen af et prøvesvar.
				</p>
			</section>
		</div>
	</main>
</div>