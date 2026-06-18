<script>
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let repeatPassword = $state('');
	let role = $state('');
	let cpr = $state('');

	let errorMessage = $state('');
	let successMessage = $state('');

	const roles = [
		{
			value: 'patient',
			title: 'Patient'
		},
		{
			value: 'laege',
			title: 'Læge'
		}
	];

	function goToLogin() {
		goto('/');
	}

	function chooseRole(selectedRole) {
		role = selectedRole;
		errorMessage = '';
		successMessage = '';

		if (selectedRole !== 'patient') {
			cpr = '';
		}
	}

	function formatCpr(value) {
		return value.replace(/\D/g, '').slice(0, 10);
	}

	function handleCprInput(event) {
		cpr = formatCpr(event.target.value);
		errorMessage = '';
		successMessage = '';
	}

	async function createUser() {
		errorMessage = '';
		successMessage = '';

		if (role === '') {
			errorMessage = 'Vælg om brugeren er patient eller læge.';
			return;
		}

		if (role === 'patient' && cpr.length !== 10) {
			errorMessage = 'Indtast patientens CPR-nummer på 10 cifre.';
			return;
		}

		if (username.trim() === '' || password === '' || repeatPassword === '') {
			errorMessage = 'Udfyld brugernavn, password og gentag password.';
			return;
		}

		if (password !== repeatPassword) {
			errorMessage = 'De to passwords er ikke ens.';
			return;
		}

		try {
			const response = await fetch('/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: username.trim(),
					password: password,
					repeatPassword: repeatPassword,
					role: role,
					cpr: role === 'patient' ? cpr : null
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Brugeren kunne ikke oprettes.';
				return;
			}

			successMessage = 'Brugeren er oprettet og gemt i databasen.';

			username = '';
			password = '';
			repeatPassword = '';
			role = '';
			cpr = '';

			setTimeout(() => {
				goto('/');
			}, 1000);
		} catch {
			errorMessage = 'Der opstod en fejl. Tjek at serveren og databasen kører.';
		}
	}
</script>

<div class="min-h-screen bg-white">
	<header class="bg-[#063b68] text-white">
		<div class="h-16 bg-[#084a7d]"></div>

		<div class="px-6 py-8">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm tracking-widest uppercase">
						Hornhindeprojekt
					</p>

					<h2 class="text-2xl font-bold">
						Digital sundhedsplatform
					</h2>
				</div>

				<div class="text-right">
					<p class="text-sm opacity-80">
						Version 1.0
					</p>

					<p class="text-xs opacity-70">
						SvelteKit system
					</p>
				</div>
			</div>
		</div>
	</header>

	<main class="px-6 pt-8 pb-16">
		<section class="text-center mb-8">
			<h1 class="text-[#063b68] text-5xl font-bold leading-tight">
				Opret<br />
				bruger
			</h1>

			<p class="mt-6 text-xl text-black">
				Opret adgang til Min Sundhedsplatform.
			</p>
		</section>

		<section class="max-w-md mx-auto">
			<div class="mb-6">
				<p class="text-[#063b68] text-sm uppercase tracking-wide font-semibold mb-3">
					Vælg rolle
				</p>

				<div class="grid grid-cols-1 gap-3">
					{#each roles as item}
						<button
							type="button"
							class={role === item.value
								? 'w-full border-2 border-[#063b68] bg-[#eef4f8] rounded-xl px-4 py-5 text-left'
								: 'w-full border border-gray-300 bg-white rounded-xl px-4 py-5 text-left hover:bg-[#f3f8fc] transition'}
							onclick={() => chooseRole(item.value)}
						>
							<div class="flex items-center justify-between gap-4">
								<p class="text-[#063b68] text-xl font-bold">
									{item.title}
								</p>

								<div
									class={role === item.value
										? 'w-6 h-6 rounded-full bg-[#063b68] border-2 border-[#063b68] shrink-0'
										: 'w-6 h-6 rounded-full border-2 border-[#063b68] shrink-0'}
								></div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			{#if role === 'patient'}
				<div class="mb-6">
					<label
						for="cpr"
						class="block text-[#063b68] text-sm uppercase tracking-wide font-semibold mb-3"
					>
						CPR-nummer
					</label>

					<input
						id="cpr"
						class="w-full px-4 py-3 border border-gray-300 rounded-md text-lg"
						type="text"
						placeholder="Indtast 10 cifre"
						value={cpr}
						oninput={handleCprInput}
					/>

					<p class="text-gray-500 text-sm mt-2">
						CPR-nummeret kobler patientbrugeren til patientdata i databasen.
					</p>
				</div>
			{/if}

			<input
				class="w-full mb-4 px-4 py-3 border border-gray-300 rounded-md text-lg"
				type="text"
				placeholder="Indtast brugernavn"
				aria-label="Brugernavn"
				bind:value={username}
			/>

			<input
				class="w-full mb-4 px-4 py-3 border border-gray-300 rounded-md text-lg"
				type="password"
				placeholder="Indtast password"
				aria-label="Password"
				bind:value={password}
			/>

			<input
				class="w-full mb-6 px-4 py-3 border border-gray-300 rounded-md text-lg"
				type="password"
				placeholder="Gentag password"
				aria-label="Gentag password"
				bind:value={repeatPassword}
			/>

			{#if errorMessage !== ''}
				<div class="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
					<p class="text-red-700 text-sm">
						{errorMessage}
					</p>
				</div>
			{/if}

			{#if successMessage !== ''}
				<div class="mb-4 bg-[#eef4f8] border border-[#9ec1dc] rounded-xl px-4 py-3">
					<p class="text-[#063b68] text-sm font-semibold">
						{successMessage}
					</p>
				</div>
			{/if}

			<button
				type="button"
				class="w-full bg-[#063b68] text-white text-xl py-4 rounded-md mb-4 hover:bg-[#052f53]"
				onclick={createUser}
			>
				Opret bruger
			</button>

			<button
				type="button"
				class="w-full bg-[#0b3a70] text-white text-xl py-4 rounded-md hover:bg-[#082d57]"
				onclick={goToLogin}
			>
				Tilbage til login
			</button>
		</section>
	</main>
</div>