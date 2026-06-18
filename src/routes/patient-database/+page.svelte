<script>
	import { goto } from '$app/navigation';

	let cpr = $state('');
	let message = $state('');
	let messageType = $state('');
	let loading = $state(false);

	function goBack() {
		goto('/');
	}

	async function logout() {
		try {
			await fetch('/api/logout', {
				method: 'POST'
			});
		} finally {
			goto('/');
		}
	}

	function formatCpr(value) {
		return value.replace(/\D/g, '').slice(0, 10);
	}

	function handleCprInput(event) {
		cpr = formatCpr(event.target.value);
		message = '';
		messageType = '';
	}

	async function searchPatient() {
		message = '';
		messageType = '';

		if (cpr.length !== 10) {
			message = 'Indtast et CPR-nummer på 10 cifre.';
			messageType = 'error';
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/patients/search?cpr=' + encodeURIComponent(cpr));
			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Patienten kunne ikke findes.';
				messageType = 'error';
				loading = false;
				return;
			}

			await goto('/home?cpr=' + encodeURIComponent(cpr));
		} catch {
			message = 'Der opstod en fejl. Prøv igen senere.';
			messageType = 'error';
			loading = false;
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			searchPatient();
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
					aria-label="Tilbage til login"
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

				<button
					class="bg-[#0b4f87] text-white px-5 py-4 rounded-xl font-bold hover:bg-[#083f70] justify-self-end"
					onclick={logout}
				>
					Log ud
				</button>
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
					Patientdatabase
				</h2>

				<p class="text-black text-lg mt-2">
					Søg efter en patient for at åbne patientens dashboard.
				</p>
			</section>

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Lægeadgang
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Søg patient
					</h3>

					<p class="text-gray-600 text-sm mt-2 leading-relaxed">
						Indtast patientens CPR-nummer for at åbne patientens dashboard.
					</p>
				</div>

				<div class="px-6 py-5 space-y-5">
					<div>
						<label for="cpr" class="block text-[#063b68] font-bold mb-2">
							CPR-nummer
						</label>

						<input
							id="cpr"
							class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
							type="text"
							placeholder="Indtast CPR-nummer"
							value={cpr}
							oninput={handleCprInput}
							onkeydown={handleKeydown}
						/>

						<p class="text-gray-500 text-sm mt-2">
							CPR-nummeret bruges til at finde den korrekte patient.
						</p>
					</div>

					{#if message !== ''}
						<div
							class={messageType === 'success'
								? 'bg-[#eef4f8] border border-[#9ec1dc] rounded-xl px-5 py-4'
								: 'bg-red-50 border border-red-200 rounded-xl px-5 py-4'}
						>
							<p
								class={messageType === 'success'
									? 'text-[#063b68] text-sm font-bold'
									: 'text-red-700 text-sm font-bold'}
							>
								{message}
							</p>
						</div>
					{/if}

					<button
						type="button"
						class={loading
							? 'w-full bg-gray-400 text-white py-4 rounded-xl text-lg font-bold cursor-not-allowed'
							: 'w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]'}
						onclick={searchPatient}
						disabled={loading}
					>
						{loading ? 'Åbner patient...' : 'Søg patient'}
					</button>
				</div>
			</section>
		</div>
	</main>
</div>