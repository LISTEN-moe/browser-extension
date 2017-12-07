window.addEventListener('hashchange', () => {
	const authToken = localStorage.satellizer_token || null;
	chrome.storage.local.set({ authToken });
});
