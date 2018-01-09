window.addEventListener('hashchange', () => {
	const authToken = localStorage.satellizer_token || '';
	chrome.storage.local.set({ authToken });
});
