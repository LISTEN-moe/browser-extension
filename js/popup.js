/* Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions */
const background = chrome.extension.getBackgroundPage();
const radio = background.radio;

/* Because firefox is retarded */
if (background.isFirefox)
	document.querySelector('#volume-slider').style.verticalAlign = 'sub';

function setInfo() {

	let data = radio.data;

	/* Sets Current Listners */
	document.querySelector('#current-listeners').innerText = (typeof data.listeners !== 'undefined') ? data.listeners : 'N/A';

	const npElement = document.querySelector('#now-playing-text');

	while (npElement.hasChildNodes())
		npElement.removeChild(npElement.lastChild);

	for (let index in data.song.artists) {

		let artist = data.song.artists[index];

		let artistLink = background.createElement('a', {
			class: 'artist',
			href: `https://listen.moe/music/artists/${artist.id}`,
			target: '_blank'
		});

		const artistName = artist.nameRomaji || artist.name;

		artistLink.appendChild(document.createTextNode(artistName));
		npElement.appendChild(artistLink);

		if (index < data.song.artists.length - 1)
			npElement.appendChild(document.createTextNode(', '));

	}

	if (data.song.artists.length)
		npElement.appendChild(document.createTextNode(' - '));

	npElement.appendChild(document.createTextNode(data.song.title || 'No data'));

	/* Sets Requester Info */
	if (data.event) {
		// Soon:tm:
	} else if (data.requester) {
		document.querySelector('#now-playing-request-user').innerText = data.requester.displayName;
		document.querySelector('#now-playing-request-user').setAttribute('href', `https://listen.moe/u/${data.requester.username}`);
		document.querySelector('#now-playing-request').style.display = 'block';
	} else {
		document.querySelector('#now-playing-request-user').innerText = '';
		document.querySelector('#now-playing-request-user').setAttribute('href', '');
		document.querySelector('#now-playing-request').style.display = 'none';
	}

	if (data.queue) {

		document.querySelector('#queue-container').style.display = 'block';
		document.querySelector('#queue-amount').innerText = data.queue.inQueue;

		if (data.queue.inQueueByUser) {

			document.querySelector('#queue-user-before').style.display = 'block';

			document.querySelector('#queue-amount').parentElement.setAttribute('title', `You have ${data.queue.inQueueByUser} queued song(s)`)
			document.querySelector('#queue-amount').parentElement.style.cursor = 'help';

			if (data.queue.inQueueBeforeUser === 0)
				document.querySelector('#queue-user-before-amount').innerText = 'The next song is yours!';
			else if (data.queue.inQueueBeforeUser === 1)
				document.querySelector('#queue-user-before-amount').innerText = `There is ${data.queue.inQueueBeforeUser} song before your next song.`;
			else
				document.querySelector('#queue-user-before-amount').innerText = `There is ${data.queue.inQueueBeforeUser} songs before your next song.`;

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

	if (radio.user) {

		document.querySelector('#toggle-favorite').style.display = 'block';
		document.querySelector('#radio-login').style.display = 'none';
		document.querySelector('#radio-favorite').classList.remove('login');

		if (data.song.favorite)
			document.querySelector('#toggle-favorite').classList.add('active');
		else
			document.querySelector('#toggle-favorite').classList.remove('active');

	} else {

		document.querySelector('#toggle-favorite').style.display = 'none';
		document.querySelector('#radio-login').style.display = 'block';
		document.querySelector('#radio-favorite').classList.add('login');

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
	window.getSelection().selectAllChildren(this);
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
	document.querySelector('#radio-toggle').classList.remove('icon-music-pause-a');

/* Enable/Disable Player */
document.querySelector('#radio-toggle').addEventListener('click', function() {
	if (radio.isPlaying()) {
		this.classList.remove('icon-music-pause-a');
		radio.disable();
	} else {
		this.classList.add('icon-music-pause-a');
		radio.enable();
	}
});

/* Favorites Button */
document.querySelector('#toggle-favorite').addEventListener('click', function() {
	// this.classList.toggle('active');
	background.radio.toggleFavorite();
});

/* Opens Keyboard Shortcuts */
document.querySelector('#settings').addEventListener('click', () => {
	chrome.runtime.openOptionsPage();
});

radio.player.addEventListener('songChanged', setInfo);

setInfo();