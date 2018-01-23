/* Shortcut for chrome.storage.local api */
var storage = chrome.storage.local;

/* Browser Detection */
var isFirefox = typeof InstallTrigger !== 'undefined';

/* On Install */
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'update')
		notifications.create('LISTEN.moe', `Extension has updated to v${chrome.runtime.getManifest().version}`);
});

/* Defaults */
var defaults = {
	volume: 50,
	enableAutoplay: false,
	enableNotifications: true,
	enableEventNotifications: true,
	authToken: ''
};

/* Storage Items */
let storageItems = {};

/* Gets stored values if any and applies them */
storage.get(defaults, (items) => {

	if (typeof items.volume !== 'undefined')
		radio.setVol(items.volume);

	if (items.enableAutoplay)
		radio.enable();

	storageItems = items;

});

/* If the token is updated, update the variable here and attempt to authenticate with the WS */
chrome.storage.onChanged.addListener((changes) => {
	for (let item in changes) {
		storageItems[item] = changes[item].newValue;
		if (item === 'authToken') {
			radio.socket.auth();
		}
	}
});

var radio = {
	player: createElement('audio', {
		id: 'listen-moe',
		autoplay: true
	}),
	enable: function() {
		return radio.player.setAttribute('src', 'https://listen.moe/stream');
	},
	disable: function() {
		return radio.player.setAttribute('src', '');
	},
	toggle: function() {
		return radio.isPlaying() ? radio.disable() : radio.enable();
	},
	isPlaying: function() {
		return !radio.player.paused;
	},
	setVol: function(volume) {
		if (Number.isInteger(volume)) {
			if ((volume / 100) >= 0 && (volume / 100) <= 1) {
				radio.player.volume = volume / 100;
				storage.set({ volume });
			}
		}
	},
	getVol: function() {
		return radio.player.volume * 100;
	},
	data: {},
	user: null,
	socket: {
		ws: null,
		event: new Event('songChanged'),
		data: {
			lastSongID: -1
		},
		init: function() {

			radio.socket.ws = new WebSocket('wss://listen.moe/gateway');

			radio.socket.ws.onopen = () => {
				console.info('Alright we got a connection. \\o/');
				radio.socket.auth();
			};

			radio.socket.ws.onerror = (err) => {
				console.error(err);
			};

			radio.socket.ws.onclose = (err) => {
				if (err) console.info(err);
				console.info('%cWebsocket connection closed. Reconnecting...', 'color: #ff015b;', err);
				clearInterval(radio.socket.sendHeartbeat);
				setTimeout(radio.socket.init, 5000);
			};

			radio.socket.ws.onmessage = (message) => {

				if (!message.data.length) return;

				let response;

				try {
					response = JSON.parse(message.data);
				} catch (error) {
					return console.error(err);
				}

				if (response.op === 0) {
					radio.user = response.d.user;
					return radio.socket.heartbeat(response.d.heartbeat);
				}

				if (response.op === 1) {

					if (response.t !== 'TRACK_UPDATE' && response.t !== 'TRACK_UPDATE_REQUEST') return;

					radio.data = response.d;

					radio.player.dispatchEvent(radio.socket.event);

					if (radio.data.song.id !== radio.socket.data.lastSongID) {

						if (radio.socket.data.lastSongID !== -1 && radio.isPlaying() && storageItems.enableNotifications)
							notifications.create('Now Playing', radio.data.song.title, radio.data.song.artists.map(a => a.name).join(', '));

						radio.socket.data.lastSongID = radio.data.song.id;

					}

				}

			};

		},
		auth: function() {
			clearInterval(radio.socket.sendHeartbeat);
			radio.socket.ws.send(JSON.stringify({
				op: 0, d: {
					auth: 'Bearer ' + storageItems.authToken || ''
				}
			}));
		},
		heartbeat: function(heartbeat) {
			radio.socket.sendHeartbeat = setInterval(() => {
				console.info('%cSending heartbeat...', 'color: #ff015b;');
				radio.socket.ws.send(JSON.stringify({ op: 9 }));
			}, heartbeat);
		}
	},
	toggleFavorite: function() {
		return new Promise((resolve, reject) => {

			const headers = new Headers({
				'Authorization': 'Bearer ' + storageItems.authToken,
				'Accept': 'application/vnd.listen.v4+json',
				'Content-Type': 'application/json'
			});

			const id = radio.data.song.id;
			const method = radio.data.song.favorite ? 'DELETE': 'POST';

			fetch(`https://listen.moe/api/favorites/${id}`, {
				method, headers,
			})
				.then((response) => {
					radio.socket.ws.send(JSON.stringify({ op: 2 }));
				})
				.catch(error => {
					console.error(error);
					radio.socket.ws.send(JSON.stringify({ op: 2 }));
				});

		});
	}
};

radio.socket.init();

chrome.commands.onCommand.addListener((command) => {
	if (command === 'toggle_radio')
		radio.toggle();
	else if (command === 'vol_up')
		(radio.getVol() > 95) ? radio.setVol(100) : radio.setVol(Math.floor(radio.getVol() + 5));
	else if (command === 'vol_down')
		(radio.getVol() < 5) ? radio.setVol(0) : radio.setVol(Math.floor(radio.getVol() - 5));
	else if (command === 'now_playing') {
		notifications.create('Now Playing', radio.data.song.title, radio.data.song.artists.map(a => a.name).join(', '));
	}
});

/* Modify Request Header to change UserAgent */
chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
	if (details.tabId === -1) {
		for (let header of details.requestHeaders) {
			if (header.name === 'User-Agent')
				header.value = `${chrome.runtime.getManifest().name} ${isFirefox ? 'Firefox' : 'Chrome'} Extension v${chrome.runtime.getManifest().version} (https://github.com/LISTEN-moe/browser-extension)`
		}
	}
	return {requestHeaders: details.requestHeaders}
}, { urls: [ "*://listen.moe/api/*", "*://listen.moe/stream" ] }, ["blocking", "requestHeaders"]);

chrome.webRequest.onCompleted.addListener((details) => {

	/* Update the data in the extension if the user favorites a song on the site */
	if (details.tabId !== -1 && details.url.startsWith('https://listen.moe/api/favorites/'))
		radio.socket.ws.send(JSON.stringify({ op: 2 }));

}, { urls: ["*://listen.moe/api/*"] }, ["responseHeaders"]);

const notifications = {
	create: function(title, message, altText, sticky = false) {

		if (!title || !message) return;

		let notificationContent = {
			type: 'basic',
			title, message,
			iconUrl: 'images/logo128.png'
		};

		if (!isFirefox)
			notificationContent.requireInteraction = sticky || false;

		if (altText && typeof altText === 'string') {
			/* Firefox does not have contentMessage support yet. */
			if (isFirefox)
				notificationContent.message += '\n' + altText;
			else
				notificationContent.contextMessage = altText;
		}

		if (!isFirefox && radio.user)
			notificationContent.buttons = [{ title: radio.data.song.favorite ? 'Remove from Favorites' : 'Add to Favorites' }]

		let id = 'notification_' + Date.now();

		chrome.notifications.create(id, notificationContent);

		return id;

	},
	update: function(id, options) {
		chrome.notifications.update(id, options);
	},
	clear: function(id, timeout) {
		setTimeout(() => chrome.notifications.clear(id), timeout || 0);
	}
};

chrome.notifications.onButtonClicked.addListener((id, index) => {
	radio.toggleFavorite(radio.data.song_id).then((favorited) => {
		notifications.clear(id);
		if (favorited)
			notifications.create('Favorites Updated!', `Added ${radio.data.song_name} to favorites!`);
		else
			notifications.create('Favorites Updated!', `Removed ${radio.data.song_name} from favorites!`);
	}).catch((error) => {
		notifications.clear(id);
		notifications.create('Error Updating Favorites!', 'An error has occured while trying to update your favorites!');
	});
});

chrome.notifications.onClicked.addListener((id) => {
	chrome.notifications.clear(id);
});

function createElement(tag, attrs, styles) {
	let element = document.createElement(tag);
	for (let key in attrs)
		element.setAttribute(key, attrs[key]);
	for (let key in styles)
		element.style[key] = styles[key];
	return element;
}