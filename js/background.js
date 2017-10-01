/* Shortcut for chrome.storage.local api */
var storage = chrome.storage.local;

/* On Install */
chrome.runtime.onInstalled.addListener(function (details) {
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

/* Create player */
var player = $('<audio id="listen-moe" autoplay>').appendTo('body')[0];


/* Storage Items */
var storageItems = {};

/* Gets stored values if any and applies them */
storage.get(defaults, function(items) {
	if (typeof items.volume !== 'undefined') radio.setVol(items.volume);
	if (items.enableAutoplay) radio.enable();
	storageItems = items;
});

/* If the token is updated, update the variable here and attempt to authenticate with the WS */
chrome.storage.onChanged.addListener(function(changes) {
	for (var item in changes) {
		storageItems[item] = changes[item].newValue;
		if (item === 'authToken') radio.socket.sendToken();
	}
});

var radio = {
	enable: function() {
		chrome.browserAction.setBadgeText({ text: '▶' })
		return player.setAttribute('src', 'https://listen.moe/stream');
	},
	disable: function() {
		chrome.browserAction.setBadgeText({ text: '' })
		return player.setAttribute('src', '');
	},
	toggle: function() {
		return radio.isPlaying() ? radio.disable() : radio.enable();
	},
	isPlaying: function() {
		return player.paused ? false : true;
	},
	setVol: function(vol) {
		if (typeof vol !== 'undefined' && Number.isInteger(vol) ) {
			if ((vol / 100) >= 0 && (vol / 100) <= 1 ) {
				player.volume = vol / 100;
				storage.set({ volume: vol });
				return 'Set Volume to', vol;
			} else {
				throw Error('Value must be between 0 and 100!');
			}
		} else {
			throw Error('Numerical Value Required!');
		}
	},
	getVol: function() {
		return player.volume * 100;
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

			radio.socket.ws.onopen = function() {
				console.log('Alright we got a connection. \\o/');
				setTimeout(radio.socket.sendToken, 1000);
			}

			radio.socket.ws.onerror = function() {
				console.log('Uhh. Something happened');
			}

			radio.socket.ws.onclose = function() {
				console.log('Welp. The connection was closed :(');
				console.log('Reconnecting...');
				radio.socket.data.lastSongID = -1;
				setTimeout(radio.socket.init, 10000);
			};

			radio.socket.ws.onmessage = function(response) {
				if (response.data !== '') {

					var data;
					try { data = JSON.parse(response.data); }
					catch (err) { console.error(err); }
					if (!data || data.reason) return;

					console.log(data);

					radio.data = data;

					/* Emit event for Popup.js */
					window.dispatchEvent(radio.socket.event);

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
								notifications.create(`🎉 ${data.requested_by} has started! 🎉`, radio.data.song_name, radio.data.artist_name);
							else
								notifications.create(`🎉 ${data.requested_by} 🎉`, radio.data.song_name, radio.data.artist_name);

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
				$.ajax({
					url: "https://listen.moe/api/user",
					type: 'GET',
					headers: { 'Authorization': 'Bearer ' + storageItems.authToken },
					success: function(response) {
						radio.socket.ws.send(JSON.stringify({ token: storageItems.authToken }))
					},
					error: function(error) { console.error(error); }
				});
			}

		}
	},
	toggleFavorite: function(song) {
		return new Promise(function(resolve, reject) {
			$.ajax({
				url: 'https://listen.moe/api/songs/favorite',
				type: 'POST',
				headers: { 'Authorization': 'Bearer ' + storageItems.authToken },
				contentType: 'application/json;charset=utf-8',
				data: JSON.stringify({ song }),
				success: function (response) {
					if (response.success) {
						resolve(response.favorite);
						/* Update the info set in the background page. Also making sure the song hasn't changed while the request was being made */
						if (radio.data.song_id === song)
							radio.data.extended.favorite = !radio.data.extended.favorite;
					} else {
						reject(error);
					}
				},
				error: function (error) {
					reject(error);
				}
			});
		});
	}
};

radio.socket.init();

chrome.commands.onCommand.addListener(function(command) {
	if (command === 'toggle_radio')
		radio.toggle();
	else if (command === 'vol_up')
		(radio.getVol() > 95) ? radio.setVol(100) : radio.setVol(Math.floor(radio.getVol() + 5));
	else if (command === 'vol_down')
		(radio.getVol() < 5) ? radio.setVol(0) : radio.setVol(Math.floor(radio.getVol() - 5));
	else if (command === 'now_playing') {
		var npText = /\s/g.test(radio.data.requested_by) ? `🎉 ${radio.data.requested_by} 🎉` : 'Now Playing';
		notifications.create(npText, radio.data.song_name, radio.data.artist_name, false, (radio.data.extended ? true : false));
	}
});

/* Modify Request Header to change UserAgent */
if (typeof InstallTrigger === 'undefined') {
	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		if (details.tabId === -1) {
			for (var header of details.requestHeaders) {
				if (header.name === 'User-Agent') header.value = `${chrome.runtime.getManifest().name} Chrome Extension v${chrome.runtime.getManifest().version}`
			}
		}
		return {requestHeaders: details.requestHeaders}
	}, { urls: [ "*://listen.moe/api/*", "*://listen.moe/stream" ] }, ["blocking", "requestHeaders"]);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	if (request.type === 'open') {
		if (request.value === 'keyshortcuts') chrome.tabs.create({ url: 'chrome://extensions/configureCommands' });
	}

});

var notifications = {
	"create": function(title, message, altText, sticky, showFavoriteButton) {

		if (!title || !message) return;

		var notificationContent = {
			type: 'basic',
			title, message,
			iconUrl: 'images/logo128.png',
			requireInteraction: sticky || false
		};

		if (altText && typeof altText === 'string') notificationContent.contextMessage = altText;

		var buttonFuntions = [];

		if (showFavoriteButton) {
			notificationContent.buttons = [{ title: radio.data.extended.favorite ? 'Remove from Favorites' : 'Add to Favorites' }]
		}

		var id = 'notification_' + Date.now();

		chrome.notifications.create(id, notificationContent);

		return id;

	},
	"update": function(id, options) {

		chrome.notifications.update(id, options);

	},
	"clear": function(id, timeout) {

		setTimeout(function() {
			chrome.notifications.clear(id);
		}, timeout || 0);

	}
};

chrome.notifications.onButtonClicked.addListener(function(id, index) {
	radio.toggleFavorite(radio.data.song_id).then(function(favorited) {
		notifications.clear(id);
		if (favorited)
			notifications.create('Favorites Updated!', `Added ${radio.data.song_name} to favorites!`);
		else
			notifications.create('Favorites Updated!', `Removed ${radio.data.song_name} from favorites!`);
	}).catch(function(error) {
		notifications.clear(id);
		notifications.create('Error Updating Favorites!', 'An error has occured while trying to update your favorites!');
	});
});

chrome.notifications.onClicked.addListener(function(id) {
	chrome.notifications.clear(id);
});
