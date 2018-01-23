/* Redirect the user back to the homepage if they are already logged in */
if (window.location.pathname === '/login' && localStorage.token)
	window.location = '/';

/* Kill me */
let authCheck = setInterval(() => {
	if (window.location.pathname !== '/login') {
		chrome.storage.local.set({ authToken: localStorage.token || '' });
		clearInterval(authCheck);
	}
}, 1000);