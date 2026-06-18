<script>
	import { goto } from '$app/navigation';

	// Senere skal spørgeskemaer hentes fra databasen via et API.
	// Lige nu er listen tom, fordi databasen ikke er koblet på endnu.
	let questionnaires = $state([]);

	function goBack() {
		goto('/home');
	}

	/*
	Senere, når databasen er klar, kan vi hente spørgeskemaer sådan:

	import { onMount } from 'svelte';

	onMount(async () => {
		const response = await fetch('/api/spoergeskemaer');

		if (response.ok) {
			const data = await response.json();
			questionnaires = data.questionnaires;
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
					Spørgeskemaer
				</h2>

				<p class="text-black text-lg mt-2">
					Her kan du se spørgeskemaer, når de er tilgængelige.
				</p>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Aktuelle spørgeskemaer
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Til dig
					</h3>
				</div>

				{#if questionnaires.length === 0}
					<div class="px-6 py-14 text-center">
						<div
							class="w-20 h-20 mx-auto rounded-full bg-[#eef4f8] flex items-center justify-center text-[#063b68] text-3xl font-bold mb-6"
						>
							✓
						</div>

						<h4 class="text-[#063b68] text-2xl font-bold">
							Ingen nye spørgeskemaer
						</h4>

						<p class="text-gray-600 text-base mt-3 leading-relaxed max-w-md mx-auto">
							Der er endnu ikke registreret spørgeskemaer for denne patient.
							Når spørgeskemaer bliver tilgængelige i databasen, vil de blive vist her.
						</p>
					</div>
				{:else}
					{#each questionnaires as questionnaire}
						<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
							<p class="text-[#063b68] text-xl font-bold">
								{questionnaire.title}
							</p>

							<p class="text-gray-600 text-sm mt-1">
								{questionnaire.description}
							</p>

							<button
								class="mt-4 bg-[#063b68] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#083f70]"
							>
								Udfyld spørgeskema
							</button>
						</div>
					{/each}
				{/if}
			</section>
		</div>
	</main>
</div>