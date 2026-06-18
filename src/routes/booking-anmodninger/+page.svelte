<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let targetCpr = $state('');
	let patientName = $state('Patient');

	let requests = $state([]);
	let loading = $state(true);

	let message = $state('');
	let messageType = $state('');

	let editingRequestId = $state(null);
	let editDate = $state('');
	let editTime = $state('');
	let editLocation = $state('Øjenambulatoriet');

	let showAppointmentForm = $state(false);
	let newAppointmentTitle = $state('Hornhindekontrol');
	let newAppointmentDate = $state('');
	let newAppointmentTime = $state('');
	let newAppointmentLocation = $state('Øjenambulatoriet');

	const appointmentTypes = [
		'Hornhindekontrol',
		'Blodprøve og EKG',
		'Telefonkonsultation',
		'Kontroltid'
	];

	onMount(async () => {
		const searchParams = new URLSearchParams(window.location.search);
		targetCpr = searchParams.get('cpr') || '';

		if (targetCpr === '') {
			message = 'Der mangler CPR-nummer på patienten.';
			messageType = 'error';
			loading = false;
			return;
		}

		await loadPatient();
		await loadRequests();
	});

	async function loadPatient() {
		try {
			const response = await fetch('/api/patients/search?cpr=' + encodeURIComponent(targetCpr));
			const data = await response.json();

			if (response.ok) {
				patientName = data.patient?.name || 'Patient';
			}
		} catch {
			patientName = 'Patient';
		}
	}

	async function loadRequests(keepMessage = false) {
		loading = true;

		if (!keepMessage) {
			message = '';
			messageType = '';
		}

		try {
			const response = await fetch('/api/booking-requests?cpr=' + encodeURIComponent(targetCpr));
			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Bookinganmodninger kunne ikke hentes.';
				messageType = 'error';
				loading = false;
				return;
			}

			requests = data.requests || [];

			requests = requests.sort((a, b) => {
				if (a.status === 'afventer' && b.status !== 'afventer') {
					return -1;
				}

				if (a.status !== 'afventer' && b.status === 'afventer') {
					return 1;
				}

				return new Date(b.createdAt) - new Date(a.createdAt);
			});
		} catch {
			message = 'Der opstod en fejl. Prøv igen senere.';
			messageType = 'error';
		} finally {
			loading = false;
		}
	}

	function getActiveRequests() {
		return requests.filter((request) => request.status === 'afventer');
	}

	function getPreviousRequests() {
		return requests.filter((request) => request.status !== 'afventer');
	}

	function goBack() {
		goto('/home?cpr=' + encodeURIComponent(targetCpr));
	}

	function getAppointmentTitle(appointmentType) {
		if (appointmentType === 'hornhinde') {
			return 'Hornhindekontrol';
		}

		if (appointmentType === 'blodprove-ekg') {
			return 'Blodprøve og EKG';
		}

		return appointmentType || 'Bookinganmodning';
	}

	function formatDate(dateValue) {
		if (!dateValue) {
			return 'Ingen dato valgt';
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
		if (status === 'afventer') {
			return 'Afventer behandling';
		}

		if (status === 'godkendt') {
			return 'Godkendt';
		}

		if (status === 'ændret') {
			return 'Ændret og godkendt';
		}

		if (status === 'afvist') {
			return 'Afvist';
		}

		if (status === 'annulleret') {
			return 'Annulleret';
		}

		return status || 'Ukendt status';
	}

	function getStatusClass(status) {
		if (status === 'afventer') {
			return 'bg-yellow-50 text-yellow-800 border-yellow-200';
		}

		if (status === 'godkendt' || status === 'ændret') {
			return 'bg-[#eef4f8] text-[#063b68] border-[#9ec1dc]';
		}

		if (status === 'afvist' || status === 'annulleret') {
			return 'bg-red-50 text-red-700 border-red-200';
		}

		return 'bg-gray-50 text-gray-700 border-gray-200';
	}

	function getAttachedFiles(fileValue) {
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

	async function approveRequest(request) {
		message = '';
		messageType = '';

		try {
			const response = await fetch('/api/booking-requests?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					id: request.id,
					action: 'approve',
					location: 'Øjenambulatoriet'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Bookinganmodningen kunne ikke godkendes.';
				messageType = 'error';
				return;
			}

			message = 'Bookinganmodningen er godkendt, og aftalen er oprettet.';
			messageType = 'success';

			await loadRequests(true);
		} catch {
			message = 'Der opstod en fejl. Prøv igen senere.';
			messageType = 'error';
		}
	}

	function startChangeRequest(request) {
		editingRequestId = request.id;
		editDate = request.preferredDate || '';
		editTime = request.preferredTime || '';
		editLocation = 'Øjenambulatoriet';
		message = '';
		messageType = '';
	}

	function cancelChangeRequest() {
		editingRequestId = null;
		editDate = '';
		editTime = '';
		editLocation = 'Øjenambulatoriet';
	}

	async function saveChangedRequest(request) {
		message = '';
		messageType = '';

		if (!editDate || !editTime) {
			message = 'Vælg ny dato og nyt klokkeslæt.';
			messageType = 'error';
			return;
		}

		try {
			const response = await fetch('/api/booking-requests?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					id: request.id,
					action: 'change',
					date: editDate,
					time: editTime,
					location: editLocation
				})
			});

			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Bookinganmodningen kunne ikke ændres.';
				messageType = 'error';
				return;
			}

			message = 'Bookinganmodningen er ændret, og aftalen er oprettet.';
			messageType = 'success';

			cancelChangeRequest();
			await loadRequests(true);
		} catch {
			message = 'Der opstod en fejl. Prøv igen senere.';
			messageType = 'error';
		}
	}

	async function rejectRequest(request) {
		message = '';
		messageType = '';

		try {
			const response = await fetch('/api/booking-requests?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					id: request.id,
					action: 'reject'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Bookinganmodningen kunne ikke afvises.';
				messageType = 'error';
				return;
			}

			message = 'Bookinganmodningen er afvist.';
			messageType = 'success';

			await loadRequests(true);
		} catch {
			message = 'Der opstod en fejl. Prøv igen senere.';
			messageType = 'error';
		}
	}

	async function cancelLinkedAppointment(request) {
		message = '';
		messageType = '';

		if (!request.appointmentId) {
			message = 'Der er ikke koblet en aftale til denne bookinganmodning.';
			messageType = 'error';
			return;
		}

		try {
			const response = await fetch('/api/appointments?cpr=' + encodeURIComponent(targetCpr), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: request.appointmentId,
					cpr: targetCpr,
					action: 'cancel'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Aftalen kunne ikke aflyses.';
				messageType = 'error';
				return;
			}

			message = 'Aftalen er aflyst, og bookingforløbet er annulleret.';
			messageType = 'success';

			await loadRequests(true);
		} catch {
			message = 'Der opstod en fejl ved aflysning af aftalen.';
			messageType = 'error';
		}
	}

	function openAppointmentForm() {
		showAppointmentForm = true;
		message = '';
		messageType = '';
	}

	function closeAppointmentForm() {
		showAppointmentForm = false;
		newAppointmentTitle = 'Hornhindekontrol';
		newAppointmentDate = '';
		newAppointmentTime = '';
		newAppointmentLocation = 'Øjenambulatoriet';
	}

	function canCreateAppointment() {
		return newAppointmentTitle !== '' && newAppointmentDate !== '' && newAppointmentTime !== '';
	}

	async function createAppointmentForPatient() {
		message = '';
		messageType = '';

		if (!canCreateAppointment()) {
			message = 'Udfyld aftaletype, dato og klokkeslæt.';
			messageType = 'error';
			return;
		}

		try {
			const response = await fetch('/api/appointments?cpr=' + encodeURIComponent(targetCpr), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cpr: targetCpr,
					title: newAppointmentTitle,
					date: newAppointmentDate,
					time: newAppointmentTime,
					location: newAppointmentLocation
				})
			});

			const data = await response.json();

			if (!response.ok) {
				message = data.message || 'Aftalen kunne ikke oprettes.';
				messageType = 'error';
				return;
			}

			message = 'Aftalen er oprettet for patienten.';
			messageType = 'success';

			closeAppointmentForm();
		} catch {
			message = 'Der opstod en fejl. Prøv igen senere.';
			messageType = 'error';
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
					aria-label="Tilbage til patientdashboard"
				>
					←
				</button>

```
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
			<p class="text-[#063b68] text-sm font-bold uppercase tracking-wide">
				Lægevisning
			</p>

			<h2 class="text-[#063b68] text-4xl font-bold leading-tight mt-1">
				Booking og anmodninger
			</h2>

			<p class="text-black text-lg mt-2">
				Patient: {patientName}
			</p>
		</section>

		{#if message !== ''}
			<section
				class={messageType === 'success'
					? 'bg-white rounded-2xl shadow-lg p-5 border-l-4 border-[#063b68] mb-6'
					: 'bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6'}
			>
				<p
					class={messageType === 'success'
						? 'text-[#063b68] text-xl font-bold'
						: 'text-red-700 text-sm font-semibold'}
				>
					{messageType === 'success' ? 'Handling gennemført' : 'Fejl'}
				</p>

				<p
					class={messageType === 'success'
						? 'text-gray-700 mt-2'
						: 'text-red-700 text-sm mt-1'}
				>
					{message}
				</p>
			</section>
		{/if}

		<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
			<div class="px-6 py-5 border-b border-gray-200">
				<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
					Afventer behandling
				</p>

				<h3 class="text-black text-2xl font-bold mt-1">
					Aktive bookinganmodninger
				</h3>

				<p class="text-gray-600 text-sm mt-2">
					Her vises kun bookinganmodninger, som endnu ikke er behandlet.
				</p>
			</div>

			{#if loading}
				<div class="px-6 py-12 text-center bg-[#eef4f8]">
					<h4 class="text-[#063b68] text-2xl font-bold">
						Indlæser bookinganmodninger...
					</h4>
				</div>
			{:else if getActiveRequests().length === 0}
				<div class="px-6 py-12 text-center bg-[#eef4f8]">
					<h4 class="text-[#063b68] text-2xl font-bold">
						Ingen aktive anmodninger
					</h4>

					<p class="text-gray-600 text-base mt-3 leading-relaxed">
						Patienten har ingen bookinganmodninger, der afventer behandling.
					</p>
				</div>
			{:else}
				{#each getActiveRequests() as request}
					<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h4 class="text-[#063b68] text-xl font-bold">
									{getAppointmentTitle(request.appointmentType)}
								</h4>

								<p class="text-gray-700 text-sm mt-2">
									Ønsket dato: {formatDate(request.preferredDate)}
								</p>

								<p class="text-gray-700 text-sm mt-1">
									Ønsket klokkeslæt: {request.preferredTime || 'Ikke angivet'}
								</p>

								{#if request.createdAt}
									<p class="text-gray-500 text-xs mt-2">
										Sendt: {formatDateTime(request.createdAt)}
									</p>
								{/if}
							</div>

							<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(request.status)}>
								{getStatusText(request.status)}
							</div>
						</div>

						{#if request.comment}
							<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
								<p class="text-[#063b68] text-sm font-bold">
									Kommentar fra patient
								</p>

								<p class="text-gray-700 text-sm mt-1 leading-relaxed">
									{request.comment}
								</p>
							</div>
						{/if}

						{#if getAttachedFiles(request.attachedFileName).length > 0}
							<div class="mt-3 bg-[#f3f8fc] rounded-xl px-4 py-3">
								<p class="text-[#063b68] text-sm font-bold">
									Vedhæftede filer
								</p>

								<div class="space-y-2 mt-2">
									{#each getAttachedFiles(request.attachedFileName) as filePath}
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

												<p class="text-gray-500 text-xs mt-1">
													Filen er registreret som filnavn, men ikke uploadet som åbent link.
												</p>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						<div class="mt-5 grid grid-cols-1 gap-3">
							<button
								type="button"
								class="w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]"
								onclick={() => approveRequest(request)}
							>
								Godkend ønsket tid
							</button>

							<button
								type="button"
								class="w-full bg-[#eef4f8] text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#dcecf7]"
								onclick={() => startChangeRequest(request)}
							>
								Ændr dato eller tid
							</button>

							<button
								type="button"
								class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
								onclick={() => rejectRequest(request)}
							>
								Afvis anmodning
							</button>
						</div>

						{#if editingRequestId === request.id}
							<div class="mt-5 bg-[#eef4f8] rounded-2xl px-5 py-5 space-y-4">
								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Ny dato
									</label>

									<input
										type="date"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										bind:value={editDate}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Nyt klokkeslæt
									</label>

									<input
										type="text"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										placeholder="Fx 10:30"
										bind:value={editTime}
									/>
								</div>

								<div>
									<label class="block text-[#063b68] font-bold mb-2">
										Lokation
									</label>

									<input
										type="text"
										class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
										bind:value={editLocation}
									/>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<button
										type="button"
										class="w-full bg-white text-[#063b68] py-3 rounded-xl font-bold hover:bg-[#f8fbfd]"
										onclick={cancelChangeRequest}
									>
										Annuller
									</button>

									<button
										type="button"
										class="w-full bg-[#063b68] text-white py-3 rounded-xl font-bold hover:bg-[#083f70]"
										onclick={() => saveChangedRequest(request)}
									>
										Gem ændring
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</section>

		<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
			<div class="px-6 py-5 border-b border-gray-200">
				<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
					Historik
				</p>

				<h3 class="text-black text-2xl font-bold mt-1">
					Tidligere bookingforløb
				</h3>

				<p class="text-gray-600 text-sm mt-2">
					Her vises anmodninger, som allerede er godkendt, ændret, afvist eller annulleret.
				</p>
			</div>

			{#if loading}
				<div class="px-6 py-12 text-center">
					<h4 class="text-[#063b68] text-2xl font-bold">
						Indlæser historik...
					</h4>
				</div>
			{:else if getPreviousRequests().length === 0}
				<div class="px-6 py-12 text-center">
					<h4 class="text-[#063b68] text-2xl font-bold">
						Ingen tidligere bookingforløb
					</h4>

					<p class="text-gray-600 text-base mt-3 leading-relaxed">
						Der er endnu ikke behandlet nogen bookinganmodninger for patienten.
					</p>
				</div>
			{:else}
				{#each getPreviousRequests() as request}
					<div class="px-6 py-5 border-b border-gray-200 last:border-b-0">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h4 class="text-[#063b68] text-xl font-bold">
									{getAppointmentTitle(request.appointmentType)}
								</h4>

								<p class="text-gray-700 text-sm mt-2">
									Ønsket dato: {formatDate(request.preferredDate)}
								</p>

								<p class="text-gray-700 text-sm mt-1">
									Ønsket klokkeslæt: {request.preferredTime || 'Ikke angivet'}
								</p>

								{#if request.appointmentId}
									<p class="text-gray-500 text-xs mt-2">
										Tilknyttet aftale er oprettet
									</p>
								{/if}
							</div>

							<div class={'border rounded-xl px-3 py-2 text-xs font-bold ' + getStatusClass(request.status)}>
								{getStatusText(request.status)}
							</div>
						</div>

						{#if request.comment}
							<div class="mt-4 bg-[#f3f8fc] rounded-xl px-4 py-3">
								<p class="text-[#063b68] text-sm font-bold">
									Kommentar fra patient
								</p>

								<p class="text-gray-700 text-sm mt-1 leading-relaxed">
									{request.comment}
								</p>
							</div>
						{/if}

						{#if getAttachedFiles(request.attachedFileName).length > 0}
							<div class="mt-3 bg-[#f3f8fc] rounded-xl px-4 py-3">
								<p class="text-[#063b68] text-sm font-bold">
									Vedhæftede filer
								</p>

								<div class="space-y-2 mt-2">
									{#each getAttachedFiles(request.attachedFileName) as filePath}
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

												<p class="text-gray-500 text-xs mt-1">
													Filen er registreret som filnavn, men ikke uploadet som åbent link.
												</p>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						{#if request.appointmentId && (request.status === 'godkendt' || request.status === 'ændret')}
							<div class="mt-5">
								<button
									type="button"
									class="w-full bg-red-50 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100"
									onclick={() => cancelLinkedAppointment(request)}
								>
									Aflys tilknyttet aftale
								</button>
							</div>
						{/if}

						{#if request.status === 'annulleret'}
							<div class="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
								<p class="text-red-700 text-sm font-bold">
									Bookingforløbet er annulleret
								</p>

								<p class="text-red-700 text-sm mt-1">
									Den tilknyttede aftale er aflyst og vises derfor ikke længere som kommende aftale.
								</p>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</section>

		<section class="bg-white rounded-2xl shadow-lg overflow-hidden">
			<div class="px-6 py-5 border-b border-gray-200">
				<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
					Opret direkte aftale
				</p>

				<h3 class="text-black text-2xl font-bold mt-1">
					Book tid på vegne af patient
				</h3>

				<p class="text-gray-600 text-sm mt-2">
					Brug denne funktion, hvis lægen selv skal oprette en aftale for patienten uden en forudgående bookinganmodning.
				</p>
			</div>

			<div class="px-6 py-5">
				{#if !showAppointmentForm}
					<button
						type="button"
						class="w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]"
						onclick={openAppointmentForm}
					>
						Opret ny aftale
					</button>
				{:else}
					<div class="space-y-5">
						<div>
							<label class="block text-[#063b68] font-bold mb-2">
								Aftaletype
							</label>

							<select
								class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
								bind:value={newAppointmentTitle}
							>
								{#each appointmentTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>

						<div>
							<label class="block text-[#063b68] font-bold mb-2">
								Dato
							</label>

							<input
								type="date"
								class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
								bind:value={newAppointmentDate}
							/>
						</div>

						<div>
							<label class="block text-[#063b68] font-bold mb-2">
								Klokkeslæt
							</label>

							<input
								type="text"
								class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
								placeholder="Fx 09:30"
								bind:value={newAppointmentTime}
							/>
						</div>

						<div>
							<label class="block text-[#063b68] font-bold mb-2">
								Lokation
							</label>

							<input
								type="text"
								class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
								bind:value={newAppointmentLocation}
							/>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								class="w-full bg-[#eef4f8] text-[#063b68] py-4 rounded-xl text-lg font-bold hover:bg-[#dcecf7]"
								onclick={closeAppointmentForm}
							>
								Annuller
							</button>

							<button
								type="button"
								class={canCreateAppointment()
									? 'w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70]'
									: 'w-full bg-gray-300 text-gray-600 py-4 rounded-xl text-lg font-bold cursor-not-allowed'}
								onclick={createAppointmentForPatient}
								disabled={!canCreateAppointment()}
							>
								Opret aftale
							</button>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>
```

</div>
