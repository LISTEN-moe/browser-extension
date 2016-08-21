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