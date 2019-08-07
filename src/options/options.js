chrome.storage.local.get({
	enableAutoplay: false,
	enableNotifications: true,
	enableEventNotifications: true
}, (items) => {
	document.getElementById('enableAutoplay').checked = items.enableAutoplay;
	document.getElementById('enableNotifications').checked = items.enableNotifications;
	document.getElementById('enableEventNotifications').checked = items.enableEventNotifications;
});

document.querySelectorAll('input[type="checkbox"]').forEach((element) => {
	element.addEventListener('change', function() {
		chrome.storage.local.set({ [this.id]: this.checked });
	});	
});

document.getElementById('shortcuts').addEventListener('click', () => {
	chrome.tabs.update({ url: 'chrome://extensions/configureCommands' });
});

if (typeof InstallTrigger !== 'undefined') // Is Firefox
	document.getElementById('shortcuts').style.display = 'none';