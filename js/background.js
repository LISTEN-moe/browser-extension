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
		player.setAttribute('src', 'https://listen.moe/stream');
	},
	disable: function() {
		player.setAttribute('src', '');
	},
	toggle: function() {
		radio.isPlaying() ? radio.disable() : radio.enable();
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

chrome.commands.onCommand.addListener(function(command) {
	console.log(command);
	if (command === 'toggle_radio') radio.toggle();
	else if (command === 'vol_up') (radio.getVol() > 95) ? radio.setVol(100) : radio.setVol(Math.floor(radio.getVol() + 5));
	else if (command === 'vol_down') (radio.getVol() < 5) ? radio.setVol(0) : radio.setVol(Math.floor(radio.getVol() - 5));
});

// Modify Request Header to change UserAgent
if (typeof InstallTrigger === 'undefined') {
	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		// We don't want this to affect all headers sent. Only the ones coming from the background or popup pages.
		// All requests coming from the background or popup pages will have a Tab Id of -1. Everything else will have a browser generated Tab Id.
		if (details.tabId === -1) {
			for (var i = 0; i < details.requestHeaders.length; ++i) {
				if (details.requestHeaders[i].name === 'User-Agent') {
					details.requestHeaders[i].value = `Chrome Extension - ${chrome.runtime.getManifest().name}/v${chrome.runtime.getManifest().version}`;
					break;
				}
			}
		}
		return {requestHeaders: details.requestHeaders};
	}, {urls: ["*://listen.moe/*"]}, ["blocking", "requestHeaders"]);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	if (request.type === 'open') {
		if (request.value === 'keyshortcuts') chrome.tabs.create({url: 'chrome://extensions/configureCommands'});
	}

})