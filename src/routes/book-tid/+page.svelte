<script>
	import { goto } from '$app/navigation';

	let selectedType = $state('');
	let preferredDate = $state('');
	let preferredTime = $state('');
	let comment = $state('');
	let attachedFiles = $state([]);

	let message = $state('');
	let messageType = $state('');

	const appointmentTypes = [
		{
			id: 'hornhinde',
			title: 'Hornhindekontrol',
			description: 'Kontrol i øjenambulatoriet.',
			label: 'HK'
		},
		{
			id: 'blodprove-ekg',
			title: 'Blodprøve og EKG',
			description: 'Forberedende undersøgelse.',
			label: 'EKG'
		}
	];

	const timeOptions = [
		'08:00',
		'08:30',
		'09:00',
		'09:30',
		'10:00',
		'10:30',
		'11:00',
		'11:30',
		'12:00',
		'12:30',
		'13:00',
		'13:30',
		'14:00',
		'14:30',
		'15:00'
	];

	function goBack() {
		goto('/home');
	}

	function chooseType(typeId) {
		selectedType = typeId;
		message = '';
		messageType = '';

		if (typeId !== 'hornhinde') {
			attachedFiles = [];
		}
	}

	function handleFileUpload(event) {
		const input = event.currentTarget;
		const files = Array.from(input.files || []);

		if (files.length === 0) {
			return;
		}

		const existingFileKeys = attachedFiles.map((file) => file.name + '-' + file.size);

		const newFiles = files.filter((file) => {
			const fileKey = file.name + '-' + file.size;
			return !existingFileKeys.includes(fileKey);
		});

		attachedFiles = [...attachedFiles, ...newFiles];

		input.value = '';
	}

	function removeFile(index) {
		attachedFiles = attachedFiles.filter((_, fileIndex) => fileIndex !== index);
	}

	function canSendRequest() {
		return selectedType !== '' && preferredDate !== '' && preferredTime !== '';
	}

	async function sendRequest() {
		message = '';
		messageType = '';

		if (!canSendRequest()) {
			message = 'Vælg aftaletype, ønsket dato og ønsket klokkeslæt.';
			messageType = 'error';
			return;
		}

		try {
			const formData = new FormData();

			formData.append('appointmentType', selectedType);
			formData.append('preferredDate', preferredDate);
			formData.append('preferredTime', preferredTime);
			formData.append('comment', comment);

			for (const file of attachedFiles) {
				formData.append('files', file);
			}

			const response = await fetch('/api/booking-requests', {
				method: 'POST',
				body: formData
			});

			let data = {};

			try {
				data = await response.json();
			} catch {
				data = {};
			}

			if (!response.ok) {
				message = data.message || 'Din bookinganmodning kunne ikke sendes. Prøv igen senere.';
				messageType = 'error';
				return;
			}

			message =
				data.message ||
				'Din bookinganmodning er sendt til afdelingen. Du får besked, når afdelingen har behandlet den.';
			messageType = 'success';

			selectedType = '';
			preferredDate = '';
			preferredTime = '';
			comment = '';
			attachedFiles = [];
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
					Book en tid
				</h2>

				<p class="text-black text-lg mt-2">
					Send en bookinganmodning til afdelingen.
				</p>
			</section>

			{#if message !== ''}
				<div
					class={messageType === 'success'
						? 'bg-white rounded-2xl shadow-lg p-5 border-l-4 border-[#063b68] mb-6'
						: 'bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6'}
				>
					<p
						class={messageType === 'success'
							? 'text-[#063b68] text-xl font-bold'
							: 'text-red-700 text-sm font-semibold'}
					>
						{messageType === 'success' ? 'Anmodning sendt' : 'Fejl'}
					</p>

					<p
						class={messageType === 'success'
							? 'text-gray-700 mt-2'
							: 'text-red-700 text-sm mt-1'}
					>
						{message}
					</p>
				</div>
			{/if}

			<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
				<div class="px-6 py-5 border-b border-gray-200">
					<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
						Trin 1
					</p>

					<h3 class="text-black text-2xl font-bold mt-1">
						Vælg aftaletype
					</h3>
				</div>

				{#each appointmentTypes as type}
					<button
						type="button"
						class={selectedType === type.id
							? 'w-full px-6 py-5 flex items-center justify-between text-left bg-[#eef4f8] border-b border-gray-200'
							: 'w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#f3f8fc] transition border-b border-gray-200'}
						onclick={() => chooseType(type.id)}
					>
						<div class="flex items-center gap-4">
							<div
								class="w-14 h-14 rounded-xl bg-[#eef4f8] flex items-center justify-center text-[#063b68] font-bold text-lg shrink-0"
							>
								{type.label}
							</div>

							<div>
								<p class="text-[#063b68] text-xl font-bold">
									{type.title}
								</p>

								<p class="text-gray-500 text-sm mt-1">
									{type.description}
								</p>
							</div>
						</div>

						<div
							class={selectedType === type.id
								? 'w-6 h-6 rounded-full bg-[#063b68]'
								: 'w-6 h-6 rounded-full border-2 border-[#063b68]'}
						></div>
					</button>
				{/each}
			</section>

			{#if selectedType !== ''}
				<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
					<div class="px-6 py-5 border-b border-gray-200">
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Trin 2
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Ønsket dato og klokkeslæt
						</h3>

						<p class="text-gray-600 text-sm mt-2">
							Vælg den dato og det klokkeslæt, du ønsker. Afdelingen bekræfter den endelige tid.
						</p>
					</div>

					<div class="px-6 py-5 space-y-5">
						<div>
							<label for="preferred-date" class="block text-[#063b68] font-bold mb-2">
								Ønsket dato
							</label>

							<input
								id="preferred-date"
								class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
								type="date"
								bind:value={preferredDate}
							/>
						</div>

						<div>
							<label for="preferred-time" class="block text-[#063b68] font-bold mb-2">
								Ønsket klokkeslæt
							</label>

							<select
								id="preferred-time"
								class="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg bg-white focus:outline-none focus:border-[#063b68]"
								bind:value={preferredTime}
							>
								<option value="">Vælg klokkeslæt</option>

								{#each timeOptions as option}
									<option value={option}>kl. {option}</option>
								{/each}
							</select>
						</div>
					</div>
				</section>
			{/if}

			{#if selectedType === 'hornhinde'}
				<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
					<div class="px-6 py-5 border-b border-gray-200">
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Valgfrit
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Vedhæft filer
						</h3>

						<p class="text-gray-600 text-sm mt-2">
							Du kan vedhæfte billeder eller relevante dokumenter som støtte til vurderingen.
						</p>
					</div>

					<div class="px-6 py-5">
						<input
							id="file-upload"
							type="file"
							accept="image/*,.pdf,.doc,.docx,.heic,.heif"
							multiple
							onchange={handleFileUpload}
							style="display: none;"
						/>

						<label
							for="file-upload"
							class="block border-2 border-dashed border-[#9ec1dc] rounded-xl p-6 text-center cursor-pointer hover:bg-[#f3f8fc] transition"
						>
							<p class="text-[#063b68] text-lg font-bold">
								Vælg filer
							</p>

							<p class="text-gray-500 text-sm mt-1">
								Du kan vælge flere filer. Fx billeder, PDF eller Word-dokumenter.
							</p>
						</label>

						{#if attachedFiles.length > 0}
							<div class="mt-4 bg-[#eef4f8] rounded-xl p-4">
								<p class="text-sm text-gray-600 mb-2">
									Valgte filer
								</p>

								<div class="space-y-2">
									{#each attachedFiles as file, index}
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
												onclick={() => removeFile(index)}
											>
												Fjern
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</section>
			{/if}

			{#if selectedType !== ''}
				<section class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
					<div class="px-6 py-5 border-b border-gray-200">
						<p class="text-sm text-[#063b68] uppercase tracking-wide font-semibold">
							Trin 3
						</p>

						<h3 class="text-black text-2xl font-bold mt-1">
							Supplerende oplysninger
						</h3>

						<p class="text-gray-600 text-sm mt-2">
							Skriv kun oplysninger, der er relevante for bookingen.
						</p>
					</div>

					<div class="px-6 py-5">
						<textarea
							class="w-full min-h-28 px-4 py-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-[#063b68]"
							placeholder="Skriv eventuelle bemærkninger her."
							bind:value={comment}
						></textarea>
					</div>
				</section>

				<section class="mt-6">
					<button
						type="button"
						class={canSendRequest()
							? 'w-full bg-[#063b68] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#083f70] shadow-lg'
							: 'w-full bg-gray-300 text-gray-600 py-4 rounded-xl text-lg font-bold cursor-not-allowed'}
						onclick={sendRequest}
						disabled={!canSendRequest()}
					>
						Send anmodning
					</button>
				</section>
			{/if}

			<section class="mt-8 text-center">
				<p class="text-[#063b68] text-lg font-semibold">
					Finder du ikke den aftaletype, du søger?
				</p>

				<p class="text-black mt-2">
					Kontakt din afdeling for hjælp til booking.
				</p>
			</section>
		</div>
	</main>
</div>