// The onMessage listener uses sendResponse callbacks, so async/await isn't applicable here.
/* eslint-disable promise/prefer-await-to-then */
import type { OffscreenMessage } from '@/types';

const audio = new Audio();
const mediaSession = navigator.mediaSession;

/* Media session action handlers - forward play/pause/stop to the background SW. */

const sendToggle = (): void => {
	browser.runtime.sendMessage({ target: 'background', type: 'TOGGLE_PLAY' }).catch(() => {});
};

mediaSession.setActionHandler('play', sendToggle);
mediaSession.setActionHandler('pause', sendToggle);
mediaSession.setActionHandler('stop', sendToggle);

/* Message handler - routes commands from the background SW to audio/media session. */
browser.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
	const message = rawMessage as OffscreenMessage;
	if (message.target !== 'offscreen') {
		return false;
	}

	switch (message.type) {
		case 'AUDIO_PLAY': {
			audio.src = message.src;
			audio.play()
				.then(() => {
					mediaSession.playbackState = 'playing';
					sendResponse(null);
				})
				.catch(error => {
					console.error('Audio play failed:', error);
					sendResponse(null);
				});
			return true;
		}

		case 'AUDIO_PAUSE': {
			audio.pause();
			audio.src = '';
			mediaSession.playbackState = 'paused';
			sendResponse(null);
			return false;
		}

		case 'AUDIO_SET_VOLUME': {
			audio.volume = message.volume / 100;
			sendResponse(null);
			return false;
		}

		case 'AUDIO_SET_METADATA': {
			mediaSession.metadata = new MediaMetadata({
				title: message.title,
				artist: message.artist,
				artwork: message.coverUrl
					? [{ src: message.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
					: [],
			});
			sendResponse(null);
			return false;
		}

		case 'GET_PLAYBACK_STATE': {
			sendResponse({ isPlaying: !audio.paused });
			return false;
		}
	}

	return false;
});
