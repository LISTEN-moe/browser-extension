/* Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions */
const background = chrome.extension.getBackgroundPage();
const radio = background.radio;

function setInfo() {

	let data = radio.data;

	/* Sets Current Listners */
	document.querySelector('#current-listeners').innerText = data.listeners;

	/* Sets Now Playing Info */
	document.querySelector('#now-playing-text').innerText = `${data.artist_name ? data.artist_name + ' -' : ''} ${data.song_name} ${data.anime_name ? '[' + data.anime_name + ']' : ''}`;

	/* Sets Requester Info */
	if (data.requested_by) {
		if (/\s/g.test(data.requested_by))
			document.querySelector('#now-playing-request').innerText = `🎉 ${data.requested_by} 🎉`;
		else
			document.querySelector('#now-playing-request').innerText = `Requested by ${data.requested_by}`;
		document.querySelector('#now-playing-request').style.display = 'block';
	} else {
		document.querySelector('#now-playing-request').style.display = 'none';
		document.querySelector('#now-playing-request').innerText = '';
	}

	/* Saves Song ID */
	document.querySelector('#toggle-favorite').dataset.id = data.song_id;

	if (data.extended) {

		let queue = data.extended.queue;

		document.querySelector('#favs a').setAttribute('href', 'https://listen.moe/#/favorites');
		document.querySelector('#favs a').innerText = 'View Favorites';

		document.querySelector('#toggle-favorite').style.display = 'block';

		if (data.extended.favorite)
			document.querySelector('#toggle-favorite').classList.remove('glyphicon-star-empty');
		else
			document.querySelector('#toggle-favorite').classList.add('glyphicon-star-empty');

		if (queue.songsInQueue !== 0) {

			document.querySelector('#queue-container').style.display = 'block';
			document.querySelector('#queue-amount').innerText = queue.songsInQueue;

			if (queue.hasSongInQueue) {

				document.querySelector('#queue-user-before').style.display = 'block';

				document.querySelector('#queue-amount').parentElement.setAttribute('title', `You have ${queue.songsInQueue} queued song(s)`)
				document.querySelector('#queue-amount').parentElement.style.cursor = 'help';

				if (data.extended.queue.inQueueBeforeUserSong === 0)
					document.querySelector('#queue-user-before-amount').innerText = 'The next song is yours!';
				else if (data.extended.queue.inQueueBeforeUserSong === 1)
					document.querySelector('#queue-user-before-amount').innerText = `There is ${queue.inQueueBeforeUserSong} song before your next song.`;
				else
					document.querySelector('#queue-user-before-amount').innerText = `There is ${queue.inQueueBeforeUserSong} songs before your next song.`;

			} else {

				document.querySelector('#queue-user-before').style.display = 'none';
				document.querySelector('#queue-user-before-amount').innerText = 'N/A';
				document.querySelector('#queue-amount').parentNode.setAttribute('title', '');
				document.querySelector('#queue-amount').parentNode.style.cursor = 'default';

			}

		} else {

			document.querySelector('#queue-container').style.display = 'none';
			document.querySelector('#queue-amount').innerText = 'N/A';
			document.querySelector('#queue-amount').parentNode.setAttribute('title', '');
			document.querySelector('#queue-amount').parentNode.style.cursor = 'default';

		}

	} else {

		document.querySelector('#favs a').setAttribute('href', 'https://listen.moe/#/auth');
		document.querySelector('#favs a').innerText = 'Login';

	}

}

/* Does Scrolling Text */
let timeout = setTimeout(autoScroll, 1000);

function getElWidth(el) {
	el = document.querySelector(el);
	let elementCS = getComputedStyle(el);
	return el.offsetWidth - (parseFloat(elementCS.paddingLeft) + parseFloat(elementCS.paddingRight));
}

function autoScroll() {
	let time = (Math.floor(document.querySelector('#now-playing-text').innerText.length) / 10) * 500;
	if (getElWidth('#now-playing-text') > getElWidth('#now-playing-info')) {
		clearTimeout(timeout);
		let offset = (getElWidth('#now-playing-text') + 1) - getElWidth('#now-playing-info');
		document.querySelector('#now-playing-text').style.transition = `margin ${time}ms ease-in-out`;
		document.querySelector('#now-playing-text').style.marginLeft = -offset + 'px';
		timeout = setTimeout(() => {
			document.querySelector('#now-playing-text').style.transition = `margin ${time / 4}ms ease-in-out`;
			document.querySelector('#now-playing-text').style.marginLeft = '0px';
			setTimeout(() => timeout = setTimeout(autoScroll, 10000), time / 4);
		}, time + 3000);
	}
}

document.querySelector('#now-playing-info').addEventListener('mouseenter', () => {
	let time = (Math.floor(document.querySelector('#now-playing-text').innerText.length) / 10) * 500;
	let offset = (getElWidth('#now-playing-text') + 1) - getElWidth('#now-playing-info');
	if (getElWidth('#now-playing-text') > getElWidth('#now-playing-info')) {
		clearTimeout(timeout);
		document.querySelector('#now-playing-text').style.transition = `margin ${time}ms ease-in-out`;
		document.querySelector('#now-playing-text').style.marginLeft = -offset + 'px';
	}
});

document.querySelector('#now-playing-info').addEventListener('mouseleave', () => {
	let time = (Math.floor(document.querySelector('#now-playing-text').innerText.length) / 10) * 500;
	document.querySelector('#now-playing-text').style.transition = `margin ${time / 4}ms ease-in-out`;
	document.querySelector('#now-playing-text').style.marginLeft = '0px';
	setTimeout(() => timeout = setTimeout(autoScroll, 10000), time / 4)
});

/* Copy Artist and Song Title to Clipboard */
document.querySelector('#now-playing-text').addEventListener('click', function() {
	copyText(this.innerText);
});

/* Initialize Volume Slider */
const volumeElement = document.querySelector('#volume-slider');

volumeElement.value = radio.getVol();

volumeElement.addEventListener('input', (e) => {
	radio.setVol(+e.target.value);
});

document.querySelector('#radio-volume').addEventListener('wheel', (e) => {
	volumeElement.value = e.deltaY < 0
		? +volumeElement.value + 5 
		: +volumeElement.value - 5;
	radio.setVol(+volumeElement.value);
});

/* Sets Play/Pause depending on player status */
if (!radio.isPlaying()) 
	document.querySelector('#radio-toggle').classList.remove('glyphicon-pause');

/* Enable/Disable Player */
document.querySelector('#radio-toggle').addEventListener('click', function() {
	if (radio.isPlaying()) {
		this.classList.remove('glyphicon-pause');
		radio.disable();
	} else {
		this.classList.add('glyphicon-pause');
		radio.enable();
	}
});

/* Favorites Button */
document.querySelector('#toggle-favorite').addEventListener('click', function() {
	let songID = this.dataset.id;
	background.radio.toggleFavorite(songID).then((favorited) => {
		if (favorited)
			this.classList.remove('glyphicon-star-empty');
		else
			this.classList.add('glyphicon-star-empty');
	}).catch(console.error);
});

/* Opens Keyboard Shortcuts */
document.querySelector('#settings a').addEventListener('click', () => {
	chrome.runtime.openOptionsPage();
});

radio.player.addEventListener('songChanged', setInfo);

setInfo();

/* Copies text. Nothing more. */
function copyText(text) {
	let input = document.createElement('textarea');
	document.body.appendChild(input);
	input.value = text;
	input.focus();
	input.select();
	document.execCommand('Copy');
	input.remove();
}
