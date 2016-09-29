// Shortcut for chrome.storage.local api
var storage = chrome.storage.local;

// Create player
var player = $('<audio id="listen-moe" autoplay>').appendTo('body')[0];

// Gets stored values if any and applies them
storage.get(function(items) {
	if (items.ListenMoeVol) radio.setVol(items.ListenMoeVol);
	if (items.ListenMoeAutoPlay) radio.enable();
});

var radio = {
	enable: function() {
		player.setAttribute('src', 'http://listen.moe:9999/stream');
	},
	disable: function() {
		player.setAttribute('src', '');
	},
	isPlaying: function() {
		return player.paused ? false : true;
	},
	setVol: function(a) {
		if (typeof a !== 'undefined' && Number.isInteger(a) ) {
			if ( (a / 100) >= 0 && (a / 100) <= 1 ) {
				player.volume = a / 100;
				storage.set({ListenMoeVol: a});
				return 'Set Volume to', a;
			} else {
				throw Error('Value must be between 0 and 100!');
			}
		} else {
			throw Error('Numerical Value Required!');
		}
	},
	getVol: function() {
		return player.volume * 100;
	}
};

// Saves History of Songs Played
var source = new EventSource('https://listen.moe/api/info/sse');
source.addEventListener('data', function(e) {
	var data = JSON.parse(e.data);
	storage.get(function(items) {
		if (items.history) {
			var lastEntry = items.history[items.history.length - 1];
			if (lastEntry.artist === data.artist_name && lastEntry.song === data.song_name) {
				//console.log('We good. Still the same song.');
			} else {
				items.history.push({ artist: data.artist_name, song: data.song_name });
				if (items.history.length > 20) items.history = items.history.splice(-20); // If more than 10 in history, only keep the last 10.
				storage.set({history: items.history});
				//console.log(items.history);
			}
		} else {
			storage.set({
				history: [{
					artist: data.artist_name,
					song: data.song_name
				}]
			});
		}
	});
});

// Modify Request Header to change UserAgent
if (typeof InstallTrigger === 'undefined') {
	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		// We don't want this to affect all headers sent. Only the ones coming from the background or popup pages.
		// All requests coming from the background or popup pages will have a Tab Id of -1. Everything else will have a browser generated Tab Id.
		if (details.tabId === -1) {
			for (var i = 0; i < details.requestHeaders.length; ++i) {
				if (details.requestHeaders[i].name === 'User-Agent') {
					details.requestHeaders[i].value = "Chrome Extension - Odyssey Radio/v" + chrome.runtime.getManifest().version;
					break;
				}
			}
		}
		return {requestHeaders: details.requestHeaders};
	}, {urls: ["*://listen.moe/*"]}, ["blocking", "requestHeaders"]);
}
