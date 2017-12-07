let elRandomSong;

function initRandomRequests() {

	if (window.location.hash !== '#/favorites' && window.location.hash !== '#/songs') return;

	setTimeout(() => {

		elRandomSong = document.createElement('div');

		elRandomSong.style.position = 'absolute';
		elRandomSong.style.top = '60px';
		elRandomSong.style.cursor = 'pointer';
		elRandomSong.innerText = 'Request Random Favorite';

		elRandomSong.dataset.enabled = true;

		elRandomSong.addEventListener('click', () => {

			if (elRandomSong.dataset.enabled) {
				
				elRandomSong.dataset.enabled = false;

				const headers = new Headers({
					'Authorization': 'Bearer ' + localStorage.satellizer_token
				});

				fetch('/api/user/favorites', {
					method: 'GET',
					headers: headers
				})
					.then(res => res.json())
					.then(data => {

						if (!data.success) {
							console.error(data.message);
							return;
						}

						const availableSongs = data.songs.filter(s => s.enabled !== false);
						const randomSong = availableSongs[Math.floor(Math.random() * (availableSongs.length - 1))];

						setTimeout(() => requestSong(randomSong, data.extra.requests), 500); // Cause rate-limits

					});

			} else
				console.error('Hold up fam. Wait for the previous request to finish.');

		});

		document.querySelector('.nav-center').appendChild(elRandomSong);

	}, 1000);

}

function requestSong(songInfo, requestsRemaining) {

	const headers = new Headers({
		'Authorization': 'Bearer ' + localStorage.satellizer_token,
		'Content-Type': 'application/x-www-form-urlencoded'
	});

	fetch('/api/songs/request', {
		method: 'POST',
		headers: headers,
		body: `song=${songInfo.id}`
	})
		.then(res => res.json())
		.then(data => {

			if (data.success) {
				sweetAlert('Success!', `${songInfo.artist ? songInfo.artist + ' -' : ''} ${songInfo.title} has been randomly requested!`, 'success');
				document.querySelector('span.nav-item.ng-binding').innerText = `${requestsRemaining - 1} Requests Left`;
			} else {
				sweetAlert('Oops...!', `Something went wrong. Error code: ${data.message}`, 'error');
			}

			elRandomSong.dataset.enabled = true;
			
		});

}

window.addEventListener('hashchange', () => {
	const authToken = localStorage.satellizer_token || null;
	chrome.storage.local.set({ authToken });
	initRandomRequests();
});

initRandomRequests();