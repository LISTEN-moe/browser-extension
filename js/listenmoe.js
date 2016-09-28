window.addEventListener('hashchange', function() {
	var auth_token = localStorage['satellizer_token'] ? localStorage['satellizer_token'] : null;
	chrome.storage.local.set({
		auth_token: auth_token
	});
});
