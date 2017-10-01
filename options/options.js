var background = chrome.extension.getBackgroundPage();

background.storage.get(background.defaults, function(items) {
	document.getElementById('enableAutoplay').checked = items.enableAutoplay;
	document.getElementById('enableNotifications').checked = items.enableNotifications;
	document.getElementById('enableEventNotifications').checked = items.enableEventNotifications;
})

document.querySelectorAll('input[type="checkbox"]').forEach(function(element) {
	element.addEventListener('change', function() {
		background.storage.set({ [this.id]: this.checked });
	})	
})

document.getElementById('shortcuts').addEventListener('click', function() {
	chrome.tabs.update({ url: 'chrome://extensions/configureCommands' });
});