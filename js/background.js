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
	play: function() { // Probably not going to be used.
		player.getAttribute('src') ? player.play() : console.error('Player not initialized! Enable player first!');
	},
	pause: function() { // Probably not going to be used. Pausing the stream will cause the audio to be behind and no longer "live".
		player.getAttribute('src') ? player.pause() : console.error('Player not initialized! Enable player first!');
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
	},
	autoPlay: function(a) { // Probably not going to be used.
		if (typeof a !== 'undefined') {
			player.setAttribute('autoPlay', a);
		} else {
			console.error('True | False Required!');
			return;
		} 
	}
};

// Modify Request Header to change UserAgent
chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
	// We don't want this to affect all headers sent. Only the ones coming from the background or popup pages.
	// All requests coming from the background or popup pages will have a Tab Id of -1. Everything else will have a browser generated Tab Id.
	if (details.tabId === -1) {
		console.log(details);
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name === 'User-Agent') {
				// Format: Chrome Extension - Odyssey Radio/v[version]/[version_name]
				details.requestHeaders[i].value = "Chrome Extension - Odyssey Radio/v" + chrome.app.getDetails().version + '/' + chrome.app.getDetails().version_name;
				break;
			}
		}
	}
	return {requestHeaders: details.requestHeaders};
}, {urls: ["*://listen.moe/*"]}, ["blocking", "requestHeaders"]);

