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
const defaults = {
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
		if (item === 'authToken')
			radio.socket.sendToken();
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
	socket: {
		ws: null,
		event: new Event('songChanged'),
		data: {
			eventInProgress: false,
			lastSongID: -1
		},
		init: function() {

			radio.socket.ws = new WebSocket('wss://listen.moe/api/v2/socket');

			radio.socket.ws.onopen = () => {
				console.info('Alright we got a connection. \\o/');
				setTimeout(radio.socket.sendToken, 1000);
			};

			radio.socket.ws.onerror = () => {
				console.info('Uhh. Something happened');
			};

			radio.socket.ws.onclose = () => {
				console.info('Welp. The connection was closed :(');
				console.info('Reconnecting...');
				setTimeout(radio.socket.init, 10000);
			};

			radio.socket.ws.onmessage = (response) => {
				if (response.data !== '') {

					let data;
					try { data = JSON.parse(response.data); }
					catch (err) { console.error(err); }

					if (!data || data.reason) return;

					radio.data = data;

					/* Emit event for Popup.js */
					radio.player.dispatchEvent(radio.socket.event);

					/* Display now playing when song changes
						These checks are to make sure the info doesn't display when:
						- the websocket first connects
						- the websocket drops then reconnects
						- the websocket returns the extended info
					*/

					if (data.song_id !== radio.socket.data.lastSongID) {

						/* Check if event is in progress */
						if (/\s/g.test(data.requested_by) && storageItems.enableEventNotifications) {

							if (!radio.socket.data.eventInProgress)
								notifications.create(`🎉 ${data.requested_by} has started!`, radio.data.song_name, radio.data.artist_name);
							else if (radio.isPlaying())
								notifications.create(`🎉 ${data.requested_by}`, radio.data.song_name, radio.data.artist_name);				

							radio.socket.data.eventInProgress = true;

						} else {

							if (radio.socket.data.lastSongID !== -1 && radio.isPlaying() && storageItems.enableNotifications)
								notifications.create('Now Playing', radio.data.song_name, radio.data.artist_name);

							radio.socket.data.eventInProgress = false;

						}

						radio.socket.data.lastSongID = data.song_id;

					}

				}
			};

		},
		sendToken: function() {
			if (storageItems.authToken) {

				const headers = new Headers({
					'Authorization': 'Bearer ' + storageItems.authToken
				});

				fetch('https://listen.moe/api/user', {
					method: 'GET',
					headers
				})
					.then(res => res.json())
					.then((response) => {
						radio.socket.ws.send(JSON.stringify({ token: storageItems.authToken }));
					})
					.catch(console.error);

			}

		}
	},
	toggleFavorite: function(song) {
		return new Promise((resolve, reject) => {

			const headers = new Headers({
				'Authorization': 'Bearer ' + storageItems.authToken,
				'Content-Type': 'application/x-www-form-urlencoded'
			});

			fetch('https://listen.moe/api/songs/favorite', {
				method: 'POST',
				headers,
				body: `song=${song}`
			})
				.then(res => res.json())
				.then((response) => {
					resolve(response.favorite);
						/* Update the info set in the background page. Also making sure the song hasn't changed while the request was being made */
					if (radio.data.song_id === song)
						radio.data.extended.favorite = !radio.data.extended.favorite;
				})
				.catch(reject);

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
		const npText = /\s/g.test(radio.data.requested_by) ? `🎉 ${radio.data.requested_by}` : 'Now Playing'; 
		notifications.create(npText, radio.data.song_name, radio.data.artist_name, false, (radio.data.extended ? true : false));
	}
});

/* Modify Request Header to change UserAgent */
chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
	if (details.tabId === -1) {
		for (let header of details.requestHeaders) {
			if (header.name === 'User-Agent')
				header.value = `${chrome.runtime.getManifest().name} ${isFirefox ? 'Firefox' : 'Chrome'} Extension v${chrome.runtime.getManifest().version} (https://github.com/LISTEN-moe/chrome-extension)`
		}
	}
	return {requestHeaders: details.requestHeaders}
}, { urls: [ "*://listen.moe/api/*", "*://listen.moe/stream" ] }, ["blocking", "requestHeaders"]);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

	if (request.type === 'open') {
		if (request.value === 'keyshortcuts') chrome.tabs.create({ url: 'chrome://extensions/configureCommands' });
	}

});

const notifications = {
	create: function(title, message, altText, sticky, showFavoriteButton) {

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

		if (!isFirefox && showFavoriteButton)
			notificationContent.buttons = [{ title: radio.data.extended.favorite ? 'Remove from Favorites' : 'Add to Favorites' }]

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