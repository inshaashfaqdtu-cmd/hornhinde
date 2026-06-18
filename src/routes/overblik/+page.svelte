<script>
	import { goto } from '$app/navigation';

	// Senere skal disse data hentes fra databasen via et API.
	// Lige nu er de tomme, fordi databasen ikke er koblet på endnu.
	let appointments = $state([]);
	let testResults = $state([]);
	let questionnaires = $state([]);
	let tasks = $state([]);
	let diagnoses = $state([]);
	let allergies = $state([]);
	let recommendedActions = $state([]);

	function goBack() {
		goto('/home');
	}

	function goToPage(link) {
		goto(link);
	}

	/*
	Senere, når databasen er klar, kan siden hente data sådan:

	import { onMount } from 'svelte';

	onMount(async () => {
		const response = await fetch('/api/overblik');

		if (response.ok) {
			const data = await response.json();

			appointments = data.appointments;
			testResults = data.testResults;
			questionnaires = data.questionnaires;
			tasks = data.tasks;
			diagnoses = data.diagnoses;
			allergies = data.allergies;
			recommendedActions = data.recommendedActions;
		}
	});
	*/
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
				<h2 class="text-[#063b68] text-4xl font-bold leading-tight">
					Mit overblik
				</h2>

				<p class="text-black text-lg mt-2">
					Her kan du se et samlet overblik over dine oplysninger.
				</p>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Patientoverblik
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Samlet oversigt
					</h3>

					<p class="text-gray-600 text-sm mt-2 leading-relaxed">
						Oplysningerne på denne side skal senere hentes patient-specifikt fra databasen.
					</p>
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Aftaler
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Aftaler og journalnotater
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						AF
					</div>
				</div>

				<div class="px-6 py-6">
					{#if appointments.length === 0}
						<p class="text-gray-600 text-base">
							Der er endnu ikke registreret aftaler eller journalnotater for denne patient.
						</p>
					{:else}
						<!-- Her kan aftaler fra databasen vises senere -->
					{/if}

					<button
						class="mt-5 w-full bg-[#063b68] text-white py-3 rounded-xl text-lg font-bold hover:bg-[#083f70]"
						onclick={() => goToPage('/aftaler')}
					>
						Gå til aftaler
					</button>
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Prøvesvar
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Laboratoriesvar
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						LAB
					</div>
				</div>

				<div class="px-6 py-6">
					{#if testResults.length === 0}
						<p class="text-gray-600 text-base">
							Der er endnu ikke registreret prøvesvar for denne patient.
						</p>
					{:else}
						<!-- Her kan prøvesvar fra databasen vises senere -->
					{/if}

					<button
						class="mt-5 w-full bg-[#063b68] text-white py-3 rounded-xl text-lg font-bold hover:bg-[#083f70]"
						onclick={() => goToPage('/proevesvar')}
					>
						Gå til prøvesvar
					</button>
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Spørgeskemaer
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Aktuelle spørgeskemaer
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						SK
					</div>
				</div>

				<div class="px-6 py-6">
					{#if questionnaires.length === 0}
						<p class="text-gray-600 text-base">
							Der er endnu ikke registreret spørgeskemaer for denne patient.
						</p>
					{:else}
						<!-- Her kan spørgeskemaer fra databasen vises senere -->
					{/if}

					<button
						class="mt-5 w-full bg-[#063b68] text-white py-3 rounded-xl text-lg font-bold hover:bg-[#083f70]"
						onclick={() => goToPage('/spoergeskemaer')}
					>
						Gå til spørgeskemaer
					</button>
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Opgaver
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Dine opgaver
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						OPG
					</div>
				</div>

				<div class="px-6 py-6">
					{#if tasks.length === 0}
						<p class="text-gray-600 text-base">
							Der er endnu ikke registreret opgaver for denne patient.
						</p>
					{:else}
						<!-- Her kan opgaver fra databasen vises senere -->
					{/if}

					<button
						class="mt-5 w-full bg-[#063b68] text-white py-3 rounded-xl text-lg font-bold hover:bg-[#083f70]"
						onclick={() => goToPage('/opgaver')}
					>
						Gå til opgaver
					</button>
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Diagnoser
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Registrerede diagnoser
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						DG
					</div>
				</div>

				<div class="px-6 py-8 text-center">
					{#if diagnoses.length === 0}
						<p class="text-[#063b68] text-xl font-bold">
							Ingen diagnoser registreret
						</p>

						<p class="text-gray-600 text-sm mt-2">
							Diagnoser vil blive vist her, når de hentes fra databasen.
						</p>
					{:else}
						<!-- Her kan diagnoser fra databasen vises senere -->
					{/if}
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Allergier
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Registrerede allergier
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						AL
					</div>
				</div>

				<div class="px-6 py-8 text-center">
					{#if allergies.length === 0}
						<p class="text-[#063b68] text-xl font-bold">
							Ingen allergier registreret
						</p>

						<p class="text-gray-600 text-sm mt-2">
							Allergier vil blive vist her, når de hentes fra databasen.
						</p>
					{:else}
						<!-- Her kan allergier fra databasen vises senere -->
					{/if}
				</div>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden">
				<div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
					<div>
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Anbefalede handlinger
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Handlinger
						</h3>
					</div>

					<div class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold">
						OK
					</div>
				</div>

				<div class="px-6 py-8 text-center">
					{#if recommendedActions.length === 0}
						<p class="text-[#063b68] text-xl font-bold">
							Ingen anbefalede handlinger
						</p>

						<p class="text-gray-600 text-sm mt-2">
							Anbefalede handlinger vil blive vist her, når de hentes fra databasen.
						</p>
					{:else}
						<!-- Her kan anbefalede handlinger fra databasen vises senere -->
					{/if}
				</div>
			</section>
		</div>
	</main>
</div>