<script>
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let errorMessage = $state('');

	const login = async () => {
		errorMessage = '';

		if (username.trim() === '' || password === '') {
			errorMessage = 'Indtast brugernavn og password.';
			return;
		}

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: username.trim(),
					password: password
				})
			});

			let data = {};

			try {
				data = await response.json();
			} catch {
				data = {};
			}

			if (!response.ok) {
				errorMessage = data.message || data.error || 'Forkert brugernavn eller password.';
				return;
			}

			if (data.role === 'laege') {
				goto('/patient-database');
			} else if (data.role === 'patient') {
				goto('/home');
			} else {
				errorMessage = 'Brugerens rolle kunne ikke genkendes.';
			}
		} catch {
			errorMessage = 'Der opstod en fejl. Tjek at serveren og databasen kører.';
		}
	};

	function goToCreateUser() {
		goto('/opret-bruger');
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
		<section class="text-center mb-10">
			<h1 class="text-[#063b68] text-5xl font-bold leading-tight">
				Min<br />
				Sundhedsplatform
			</h1>

			<p class="mt-6 text-xl text-black">
				Log på for at tilgå dine oplysninger.
			</p>
		</section>

		<section class="max-w-md mx-auto">
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

			{#if errorMessage !== ''}
				<div class="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
					<p class="text-red-700 text-sm">
						{errorMessage}
					</p>
				</div>
			{/if}

			<button
				type="button"
				class="w-full bg-[#063b68] text-white text-xl py-4 rounded-md mb-4 hover:bg-[#052f53]"
				onclick={login}
			>
				Log på
			</button>

			<button
				type="button"
				class="w-full bg-[#0b3a70] text-white text-xl py-4 rounded-md mb-4 hover:bg-[#082d57]"
				onclick={goToCreateUser}
			>
				Opret bruger
			</button>
		</section>
	</main>
</div>