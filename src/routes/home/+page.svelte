<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let patientName = $state('Indlæser...');
	let patientCpr = $state('');
	let loggedInName = $state('');
	let loggedInRole = $state('');
	let isDoctorViewingPatient = $state(false);
	let showCpr = $state(false);

	let menuOpen = $state(false);
	let errorMessage = $state('');

	onMount(async () => {
		try {
			const searchParams = new URLSearchParams(window.location.search);
			const cprFromUrl = searchParams.get('cpr') || '';

			const response = await fetch('/api/me');
			const data = await response.json();

			if (!response.ok) {
				goto('/');
				return;
			}

			loggedInName = data.username || 'Bruger';
			loggedInRole = data.role || '';

			if (cprFromUrl !== '') {
				isDoctorViewingPatient = true;
				patientCpr = cprFromUrl;

				const patientResponse = await fetch(
					'/api/patients/search?cpr=' + encodeURIComponent(cprFromUrl)
				);

				const patientData = await patientResponse.json();

				if (!patientResponse.ok) {
					errorMessage = patientData.message || 'Patienten kunne ikke hentes.';
					patientName = 'Patient';
					return;
				}

				patientName = patientData.patient?.name || 'Patient';
				patientCpr = patientData.patient?.cpr || cprFromUrl;
				return;
			}

			if (data.role === 'patient') {
				isDoctorViewingPatient = false;
				patientName = data.patient?.name || data.username || 'Patient';
				patientCpr = data.cpr || data.patient?.cpr || '';
				return;
			}

			if (data.role === 'laege') {
				goto('/patient-database');
				return;
			}

			patientName = data.username || 'Bruger';
		} catch {
			errorMessage = 'Patientdata kunne ikke hentes.';
			patientName = 'Patient';
		}
	});

	const patientCards = [
		{
			title: 'Aftaler og journalnotater',
			icon: 'calendar',
			link: '/aftaler'
		},
		{
			title: 'Prøvesvar',
			icon: 'lab',
			link: '/proevesvar'
		},
		{
			title: 'Spørgeskemaer',
			icon: 'clipboard',
			link: '/spoergeskemaer'
		},
		{
			title: 'Book en tid',
			icon: 'book',
			link: '/book-tid'
		},
		{
			title: 'Opgaver',
			icon: 'tasks',
			link: '/opgaver'
		},
		{
			title: 'Mit overblik',
			icon: 'overview',
			link: '/overblik'
		}
	];

	const doctorPatientCards = [
		{
			title: 'Aftaler og journalnotater',
			icon: 'calendar',
			link: '/aftaler'
		},
		{
			title: 'Prøvesvar',
			icon: 'lab',
			link: '/proevesvar'
		},
		{
			title: 'Spørgeskemaer',
			icon: 'clipboard',
			link: '/spoergeskemaer'
		},
		{
			title: 'Booking og anmodninger',
			icon: 'book',
			link: '/booking-anmodninger'
		},
		{
			title: 'Opgaver',
			icon: 'tasks',
			link: '/opgaver'
		},
		{
			title: 'Mit overblik',
			icon: 'overview',
			link: '/overblik'
		}
	];

	function getVisibleCards() {
		if (isDoctorViewingPatient) {
			return doctorPatientCards;
		}

		return patientCards;
	}

	function getCardLink(link) {
		if (isDoctorViewingPatient && patientCpr !== '') {
			return link + '?cpr=' + encodeURIComponent(patientCpr);
		}

		return link;
	}

	function openCard(link) {
		goto(getCardLink(link));
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function openMenuPage(link) {
		menuOpen = false;
		goto(getCardLink(link));
	}

	function goBackToPatientSearch() {
		goto('/patient-database');
	}

	function toggleCprVisibility() {
		showCpr = !showCpr;
	}

	function formatCpr(cprValue) {
		if (!cprValue || cprValue.length !== 10) {
			return 'Ikke tilgængeligt';
		}

		return cprValue.slice(0, 6) + '-' + cprValue.slice(6);
	}

	function maskCpr(cprValue) {
		if (!cprValue || cprValue.length !== 10) {
			return 'Skjult';
		}

		return '••••••-••••';
	}

	function getRoleText(role) {
		if (role === 'laege') {
			return 'Læge';
		}

		if (role === 'patient') {
			return 'Patient';
		}

		return 'Bruger';
	}

	async function logout() {
		try {
			await fetch('/api/logout', {
				method: 'POST'
			});
		} catch {
			// Brugeren sendes stadig tilbage til login.
		}

		menuOpen = false;
		goto('/');
	}
</script>

{#snippet Icon(icon, size)}
	{#if icon === 'calendar'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
			<rect x="3" y="5" width="18" height="16" rx="2"></rect>
			<path d="M16 3v4"></path>
			<path d="M8 3v4"></path>
			<path d="M3 10h18"></path>
			<rect x="14" y="14" width="4" height="4" fill="currentColor" stroke="none"></rect>
		</svg>
	{:else if icon === 'lab'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
			<path d="M9 2h6"></path>
			<path d="M10 2v7l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 18l-5-9V2"></path>
			<path d="M8 15h8"></path>
		</svg>
	{:else if icon === 'clipboard'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
			<rect x="5" y="4" width="14" height="17" rx="2"></rect>
			<path d="M9 4a3 3 0 0 1 6 0"></path>
			<path d="M9 12l2 2 4-5"></path>
		</svg>
	{:else if icon === 'book'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
			<rect x="3" y="5" width="18" height="16" rx="2"></rect>
			<path d="M16 3v4"></path>
			<path d="M8 3v4"></path>
			<path d="M12 15h6"></path>
			<path d="M15 12v6"></path>
		</svg>
	{:else if icon === 'tasks'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
			<circle cx="12" cy="12" r="9"></circle>
			<path d="M12 7v5l4 2"></path>
			<path d="M8 3.5l1 2"></path>
			<path d="M16 3.5l-1 2"></path>
		</svg>
	{:else}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
			<path d="M5 4h14v16H5z"></path>
			<path d="M8 4v16"></path>
			<path d="M13 12l2 2 4-5"></path>
		</svg>
	{/if}
{/snippet}

<div class="relative min-h-screen overflow-hidden" style="background-color: #9ec1dc;">
	<header class="bg-[#063b68] text-white">
		<div class="px-5 pt-6 pb-4">
			<div class="grid grid-cols-3 items-center">
				<button
					class="bg-[#0b4f87] w-14 h-14 rounded-xl flex items-center justify-center shadow-md justify-self-start hover:bg-[#083f70]"
					onclick={toggleMenu}
					aria-label="Åbn menu"
				>
					<div class="space-y-1.5">
						<div class="w-7 h-0.5 bg-white rounded"></div>
						<div class="w-7 h-0.5 bg-white rounded"></div>
						<div class="w-7 h-0.5 bg-white rounded"></div>
					</div>
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

	{#if menuOpen}
		<button
			class="fixed inset-0 z-40 bg-black/20"
			onclick={closeMenu}
			aria-label="Luk menu"
		></button>

		<aside
			class="fixed left-0 top-0 z-50 h-screen w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col"
			transition:fly={{ x: -360, duration: 180 }}
		>
			<div class="bg-[#063b68] text-white px-6 py-7">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs uppercase tracking-widest opacity-80">
							Menu
						</p>

						<h2 class="text-3xl font-bold mt-1">
							Min SP
						</h2>

						{#if isDoctorViewingPatient}
							<p class="text-sm opacity-90 mt-2">
								Patient: {patientName}
							</p>

							<p class="text-xs opacity-80 mt-1">
								Sundhedspersonale: {loggedInName}
							</p>
						{:else}
							<p class="text-sm opacity-90 mt-2">
								Patient: {patientName}
							</p>

							<p class="text-xs opacity-80 mt-1">
								CPR: {showCpr ? formatCpr(patientCpr) : maskCpr(patientCpr)}
							</p>
						{/if}
					</div>

					<button
						class="w-10 h-10 rounded-full bg-[#0b4f87] flex items-center justify-center text-2xl hover:bg-[#083f70]"
						onclick={closeMenu}
						aria-label="Luk menu"
					>
						×
					</button>
				</div>
			</div>

			<nav class="flex-1 overflow-y-auto bg-[#eef4f8] px-4 py-5">
				<div class="space-y-3">
					{#each getVisibleCards() as card}
						<button
							class="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-4 text-left shadow-sm hover:shadow-md hover:bg-[#f8fbfd] transition"
							onclick={() => openMenuPage(card.link)}
						>
							<div
								class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] shrink-0"
							>
								{@render Icon(card.icon, 34)}
							</div>

							<div class="flex-1">
								<p class="text-[#063b68] text-lg font-bold leading-tight">
									{card.title}
								</p>

								<p class="text-gray-500 text-sm mt-1">
									Åbn side
								</p>
							</div>

							<span class="text-[#063b68] text-3xl leading-none">
								›
							</span>
						</button>
					{/each}
				</div>
			</nav>

			<div class="bg-white border-t border-gray-200 px-4 py-4">
				<button
					class="w-full bg-[#063b68] text-white rounded-xl px-4 py-4 text-lg font-bold hover:bg-[#083f70]"
					onclick={logout}
				>
					Log ud
				</button>
			</div>
		</aside>
	{/if}

	<main
		class="px-6 pt-10 pb-24"
		style="min-height: calc(100vh - 112px); background: linear-gradient(180deg, #e9f1f7 0%, #9ec1dc 100%);"
	>
		<section class="max-w-3xl mx-auto mb-8">
			{#if isDoctorViewingPatient}
				<div class="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div class="px-6 py-5 border-b border-gray-200">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
									Sundhedsfaglig patientvisning
								</p>

								<h2 class="text-black text-3xl font-bold mt-1">
									{patientName}
								</h2>

								<p class="text-gray-600 text-sm mt-2">
									Du arbejder i patientens journal- og behandlingsvisning.
								</p>
							</div>

							<button
								type="button"
								class="bg-[#063b68] text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-[#083f70] shrink-0"
								onclick={goBackToPatientSearch}
							>
								Skift patient
							</button>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
						<div class="px-6 py-4 bg-[#eef4f8] border-b md:border-b-0 md:border-r border-gray-200">
							<p class="text-[#063b68] text-sm font-bold">
								Patientidentifikation
							</p>

							<div class="flex items-center justify-between gap-4 mt-2">
								<p class="text-gray-700 text-sm font-semibold">
									{showCpr ? formatCpr(patientCpr) : maskCpr(patientCpr)}
								</p>

								<button
									type="button"
									class="bg-white text-[#063b68] border border-[#9ec1dc] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#f8fbfd]"
									onclick={toggleCprVisibility}
								>
									{showCpr ? 'Skjul CPR' : 'Vis CPR'}
								</button>
							</div>
						</div>

						<div class="px-6 py-4 bg-[#f8fbfd]">
							<p class="text-[#063b68] text-sm font-bold">
								Adgang og ansvar
							</p>

							<p class="text-gray-700 text-sm mt-2">
								Logget ind som: {loggedInName}
							</p>

							<p class="text-gray-600 text-sm mt-1">
								Rolle: {getRoleText(loggedInRole)}
							</p>
						</div>
					</div>

					<div class="px-6 py-4 bg-white">
						<p class="text-gray-600 text-sm leading-relaxed">
							Patientdata vises i en sundhedsfaglig kontekst. Kontroller patientens identitet ved behov, før der oprettes aftaler, opgaver eller journalrelaterede handlinger.
						</p>
					</div>
				</div>
			{:else}
				<div class="text-center">
					<h2 class="text-4xl text-black">
						{patientName}
					</h2>

					{#if patientCpr !== ''}
						<div class="mt-5 bg-white rounded-2xl shadow-lg px-6 py-5 max-w-md mx-auto">
							<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
								Patientoplysninger
							</p>

							<div class="mt-3 flex items-center justify-between gap-4">
								<div class="text-left">
									<p class="text-gray-500 text-sm">
										CPR-nummer
									</p>

									<p class="text-black text-lg font-bold mt-1">
										{showCpr ? formatCpr(patientCpr) : maskCpr(patientCpr)}
									</p>
								</div>

								<button
									type="button"
									class="bg-[#eef4f8] text-[#063b68] border border-[#9ec1dc] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#dcecf7] shrink-0"
									onclick={toggleCprVisibility}
								>
									{showCpr ? 'Skjul CPR' : 'Vis CPR'}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if errorMessage !== ''}
				<p class="text-red-700 text-sm mt-3 text-center">
					{errorMessage}
				</p>
			{/if}
		</section>

		<section class="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-5">
			{#each getVisibleCards() as card}
				<button
					onclick={() => openCard(card.link)}
					class="bg-white rounded-2xl shadow-lg min-h-44 p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform"
				>
					<div class="mb-5 text-[#063b68]">
						{@render Icon(card.icon, 64)}
					</div>

					<p class="text-xl text-black leading-snug text-center">
						{card.title}
					</p>
				</button>
			{/each}
		</section>
	</main>
</div>