// Message listeners use sendResponse callbacks, so async/await isn't applicable here.
/* eslint-disable promise/prefer-await-to-then */
import { WebSocketManager, getStreamUrl } from '@/utils/websocket';
import { DEFAULT_SETTINGS, getSettings, setSetting } from '@/utils/storage';
import { toggleFavoriteSong, checkFavoriteSong } from '@/utils/graphql';
import { createNowPlayingNotification, createSimpleNotification } from '@/utils/notifications';
import { connectedPorts, broadcastToPopup } from '@/utils/messaging';
import type {
	RadioType,
	RadioState,
	RadioData,
	RadioSettings,
	BackgroundMessage,
	OffscreenMessage,
	PlaybackStateResponse,
	WsTrackUpdateData,
} from '@/types';

/* Audio controller abstraction */

interface AudioController {
	play(src: string): Promise<void>;
	stop(): void;
	setVolume(vol: number): void;
}

class ChromeAudioController implements AudioController {
	private async sendToOffscreen(message: OffscreenMessage): Promise<void> {
		await browser.runtime.sendMessage(message);
	}

	public async play(src: string): Promise<void> {
		await this.sendToOffscreen({ target: 'offscreen', type: 'AUDIO_PLAY', src });
	}

	public stop(): void {
		this.sendToOffscreen({ target: 'offscreen', type: 'AUDIO_PAUSE' }).catch(() => {});
	}

	public setVolume(vol: number): void {
		// Fails silently if offscreen doesn't exist yet (not playing); volume is
		// applied via play() when offscreen is next created
		this.sendToOffscreen({ target: 'offscreen', type: 'AUDIO_SET_VOLUME', volume: vol }).catch(() => {});
	}
}

class FirefoxAudioController implements AudioController {
	private element: HTMLAudioElement | null = null;

	private get audio(): HTMLAudioElement {
		this.element ??= globalThis.document.createElement('audio');
		return this.element;
	}

	public async play(src: string): Promise<void> {
		this.audio.src = src;
		await this.audio.play();
	}

	public stop(): void {
		this.audio.pause();
		this.audio.src = '';
	}

	public setVolume(vol: number): void {
		this.audio.volume = vol / 100;
	}
}

/* Chrome offscreen helpers */

async function isOffscreenAlive(): Promise<boolean> {
	const contexts = await browser.runtime.getContexts({
		contextTypes: ['OFFSCREEN_DOCUMENT'],
	});
	return contexts.length > 0;
}

async function ensureOffscreen(): Promise<void> {
	if (await isOffscreenAlive()) {
		return;
	}

	await browser.offscreen.createDocument({
		url: browser.runtime.getURL('/offscreen.html'),
		reasons: ['AUDIO_PLAYBACK'],
		justification: 'Playing LISTEN.moe radio stream',
	});
}

async function sendMetadataToOffscreen(data: RadioData): Promise<void> {
	const albumImage = data.song.albums[0]?.image;
	await browser.runtime.sendMessage({
		target: 'offscreen',
		type: 'AUDIO_SET_METADATA',
		title: data.song.title,
		artist: data.song.artists.map(a => a.nameRomaji ?? a.name).join(', '),
		coverUrl: albumImage ? `https://cdn.listen.moe/covers/${albumImage}` : null,
	}).catch(() => {});
}

/* Background main */

export default defineBackground({
	type: 'module',
	main() {
		/* State */

		let settings: RadioSettings = { ...DEFAULT_SETTINGS };
		let isPlaying = false;
		let radioType: RadioType = DEFAULT_SETTINGS.radioType;
		let volume = DEFAULT_SETTINGS.volume;
		let token: string | null = null;
		let radioData: RadioData | null = null;
		let lastSongId = -1;

		const audioController: AudioController = import.meta.env.FIREFOX
			? new FirefoxAudioController()
			: new ChromeAudioController();

		// WebSocket lives in the SW for both Chrome and Firefox.
		// Chrome 116+: an active WebSocket connection keeps the SW alive, so the
		// heartbeat (sent on the server's schedule) naturally prevents SW termination.
		const wsManager = new WebSocketManager();

		/* State helpers */

		function getState(): RadioState {
			return {
				isPlaying,
				radioType,
				volume,
				token,
				data: radioData,
			};
		}

		function broadcastState(): void {
			broadcastToPopup({ type: 'STATE_UPDATE', state: getState() });
		}

		/* Track update handler */

		async function handleTrackUpdate(data: WsTrackUpdateData): Promise<void> {
			console.log(data);

			const isNewSong = data.song.id !== lastSongId;

			let coverData: string | null = null;
			const albumImage = data.song.albums[0]?.image;

			if (albumImage) {
				try {
					const response = await fetch(`https://cdn.listen.moe/covers/${albumImage}`);
					const blob = await response.blob();
					coverData = await blobToDataUrl(blob);
				} catch {
					coverData = null;
				}

				/* coverData = await fetch(`https://cdn.listen.moe/covers/${albumImage}`)
					.then(async res => res.blob())
					.then(async blob => blobToDataUrl(blob))
					.catch(() => null); */
			}

			let isFavorite = false;

			if (token) {
				try {
					isFavorite = await checkFavoriteSong(token, data.song.id);
				} catch {}
			}

			/* const isFavorite = token
				? await checkFavoriteSong(token, data.song.id).catch(() => false)
				: false; */

			radioData = {
				song: {
					...data.song,
					coverData,
					favorite: isFavorite,
				},
				requester: data.requester,
				event: data.event,
				listeners: data.listeners,
			};

			// Persist so next SW wake (or browser restart) shows last-known song instantly
			browser.storage.local.set({ lastRadioData: radioData }).catch(() => {});
			broadcastState();

			// Media Session metadata - Chrome: push to offscreen if alive; Firefox: update directly
			if (import.meta.env.FIREFOX) {
				updateFirefoxMediaMetadata(radioData);
			} else if (await isOffscreenAlive()) {
				await sendMetadataToOffscreen(radioData);
			}

			if (isNewSong) {
				if (lastSongId !== -1) {
					const notifyNormal = isPlaying && settings.enableNotifications;
					const notifyEvent = radioData.event !== null && settings.enableEventNotifications;
					if (notifyNormal || notifyEvent) {
						createNowPlayingNotification(radioData, Boolean(token)).catch(() => {});
					}
				}

				lastSongId = data.song.id;
			}
		}

		/* Radio controls */

		async function play(): Promise<void> {
			if (import.meta.env.FIREFOX) {
				// Media Session API
				updateFirefoxMediaPlaybackState(true);
			} else {
				await ensureOffscreen();
				// Sync volume and current track metadata to the freshly created offscreen document
				audioController.setVolume(volume);
				if (radioData) {
					// Media Session API
					await sendMetadataToOffscreen(radioData);
				}
			}

			await audioController.play(getStreamUrl(radioType, settings.useFallbackStream));
			isPlaying = true;
			broadcastState();
		}

		function stop(): void {
			audioController.stop();
			isPlaying = false;
			broadcastState();
			if (import.meta.env.FIREFOX) {
				updateFirefoxMediaPlaybackState(false);
			} else {
				// Chrome: close the offscreen document; audio stops, WS stays in SW
				browser.offscreen.closeDocument().catch(() => {});
			}
		}

		async function togglePlay(): Promise<void> {
			if (isPlaying) {
				stop();
			} else {
				await play();
			}
		}

		async function setVolume(vol: number): Promise<void> {
			const clamped = Math.max(0, Math.min(100, Math.round(vol)));
			volume = clamped;
			audioController.setVolume(clamped);
			await setSetting('volume', clamped);
			broadcastState();
		}

		async function switchRadioType(): Promise<void> {
			const newType: RadioType = radioType === 'JPOP' ? 'KPOP' : 'JPOP';
			radioType = newType;
			wsManager.switchType(newType);
			await setSetting('radioType', newType);

			broadcastState();

			if (isPlaying) {
				await audioController.play(getStreamUrl(newType, settings.useFallbackStream));
			}
		}

		async function toggleFavorite(): Promise<void> {
			if (!token || !radioData) {
				return;
			}

			const { song } = radioData;

			try {
				const actualState = await checkFavoriteSong(token, song.id);

				// Only call the toggle API if we're in sync. If out of sync,
				// just correct our local state to match the server.
				if (actualState === song.favorite) {
					await toggleFavoriteSong(token, song.id);
					song.favorite = !song.favorite;
				} else {
					song.favorite = actualState;
				}

				broadcastState();
				createSimpleNotification(
					'Updated Favorites!',
					`${song.favorite ? 'Added' : 'Removed'} '${song.title}' ${song.favorite ? 'to' : 'from'} favorites!`,
				).catch(() => {});
			} catch {
				createSimpleNotification(
					'Error Updating Favorites!',
					'An error occurred while updating your favorites.',
				).catch(() => {});
			}
		}

		/* Synchronous listener registration */
		// All listeners must be registered synchronously in main() to survive
		// Chrome MV3 service worker restarts.

		// Storage changes (from settings panel or other sources)
		browser.storage.onChanged.addListener(changes => {
			for (const [key, change] of Object.entries(changes)) {
				if (!(key in settings)) {
					continue;
				}

				(settings as Record<keyof RadioSettings, unknown>)[key as keyof RadioSettings] = change.newValue;

				// TODO: rewrite to use function instead directly interacting with the audioController.
				if (key === 'radioType') {
					const newType = change.newValue as RadioType;
					radioType = newType;
					wsManager.switchType(newType);
					if (isPlaying) {
						audioController.play(getStreamUrl(newType, settings.useFallbackStream)).catch(console.error);
					}
				}

				// TODO: Create function switch streams and use it here.
				if (key === 'useFallbackStream' && isPlaying) {
					audioController.play(getStreamUrl(radioType, settings.useFallbackStream)).catch(console.error);
				}
			}
		});

		// Popup port connections
		browser.runtime.onConnect.addListener(port => {
			if (port.name !== 'popup') {
				return;
			}

			connectedPorts.add(port);
			port.onDisconnect.addListener(() => connectedPorts.delete(port));
			// Send current state immediately so popup renders without waiting for next WS update
			port.postMessage({ type: 'STATE_UPDATE', state: getState() });

			// Sync favorite state with the server in the background
			if (token && radioData) {
				checkFavoriteSong(token, radioData.song.id).then(isFavorite => {
					if (radioData && radioData.song.favorite !== isFavorite) {
						radioData.song.favorite = isFavorite;
						broadcastState();
					}
				}).catch(() => {});
			}
		});

		// Message handling (popup commands)
		browser.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
			const message = rawMessage as BackgroundMessage;
			if (message.target !== 'background') {
				return false;
			}

			switch (message.type) {
				case 'TOGGLE_PLAY': {
					togglePlay().then(() => sendResponse(null)).catch(console.error);
					return true;
				}

				case 'SET_VOLUME': {
					setVolume(message.volume).then(() => sendResponse(null)).catch(console.error);
					return true;
				}

				case 'TOGGLE_TYPE': {
					switchRadioType().then(() => sendResponse(null)).catch(console.error);
					return true;
				}

				case 'TOGGLE_FAVORITE': {
					toggleFavorite().then(() => sendResponse(null)).catch(console.error);
					return true;
				}

				case 'NOW_PLAYING_NOTIFICATION': {
					if (radioData) {
						createNowPlayingNotification(radioData, Boolean(token)).catch(() => {});
					}

					sendResponse(null);
					return false;
				}
			}

			return false;
		});

		// Keyboard shortcuts
		browser.commands.onCommand.addListener(command => {
			switch (command) {
				case 'TOGGLE_RADIO': {
					togglePlay().catch(console.error);
					break;
				}

				case 'VOLUME_UP': {
					setVolume(Math.min(100, volume + 5)).catch(console.error);
					break;
				}

				case 'VOLUME_DOWN': {
					setVolume(Math.max(0, volume - 5)).catch(console.error);
					break;
				}

				case 'NOW_PLAYING_NOTIFICATION': {
					if (radioData) {
						createNowPlayingNotification(radioData, Boolean(token)).catch(() => {});
					}

					break;
				}
			}
		});

		// Notification interactions
		browser.notifications.onButtonClicked.addListener(notifId => {
			browser.notifications.clear(notifId).catch(() => {});
			toggleFavorite().catch(console.error);
		});

		browser.notifications.onClicked.addListener(id => {
			browser.notifications.clear(id).catch(() => {});
		});

		// Token management
		browser.cookies.onChanged.addListener(details => {
			if (details.cookie.name !== 'token') {
				return;
			}

			const domain = details.cookie.domain;
			if (domain !== 'listen.moe' && domain !== '.listen.moe') {
				return;
			}

			token = details.removed ? null : details.cookie.value;
			broadcastState();
		});

		// Install/update notification
		browser.runtime.onInstalled.addListener(details => {
			if (details.reason === 'update') {
				createSimpleNotification(
					'LISTEN.moe',
					`Extension updated to v${browser.runtime.getManifest().version}`,
				).catch(() => {});
			}
		});

		// User-Agent modification
		setupUserAgentModification();

		// Firefox: register Media Session action handlers
		if (import.meta.env.FIREFOX) {
			setupFirefoxMediaSessionHandlers(async () => togglePlay(), () => stop());
		}

		// Async initialization - hydrates state from storage and starts the WebSocket + audio.
		// All listeners above are already registered, so events arriving
		// during or after this async work are handled correctly.

		void (async () => {
			settings = await getSettings();
			radioType = settings.radioType;
			volume = settings.volume;

			const tokenCookie = await browser.cookies.get({ url: 'https://listen.moe', name: 'token' });
			token = tokenCookie?.value ?? null;

			// Restore last known song for instant popup display before WS delivers fresh data
			const localData = await browser.storage.local.get('lastRadioData');
			radioData = (localData.lastRadioData as RadioData) ?? null;

			// If the SW was killed while audio was playing, the offscreen document may have
			// survived. Query it to correctly restore isPlaying state.
			if (!import.meta.env.FIREFOX && (await isOffscreenAlive())) {
				const response = await browser.runtime.sendMessage({
					target: 'offscreen',
					type: 'GET_PLAYBACK_STATE',
				}) as PlaybackStateResponse;
				isPlaying = response.isPlaying;
			}

			audioController.setVolume(volume);

			wsManager.onTrackUpdate(handleTrackUpdate);
			wsManager.setRadioType(radioType);
			wsManager.connect();

			if (settings.enableAutoplay) {
				await play();
			}
		})();
	},
});

/**
 * Converts a Blob to a data URL string via FileReader.
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/* Firefox Media Session helpers */
// Firefox MV2 background pages have full DOM access so navigator.mediaSession
// is available directly. These helpers are no-ops on Chrome (never called).

/**
 * Returns the Media Session if available, or null.
 */
function getFirefoxMediaSession(): MediaSession | null {
	return globalThis.navigator?.mediaSession ?? null;
}

/**
 * Registers play/pause/stop Media Session action handlers for Firefox.
 */
function setupFirefoxMediaSessionHandlers(onToggle: () => void, onStop: () => void): void {
	const session = getFirefoxMediaSession();

	if (!session) {
		return;
	}

	session.setActionHandler('play', onToggle);
	session.setActionHandler('pause', onToggle);
	session.setActionHandler('stop', onStop);
}

/**
 * Updates the Media Session metadata with the current track info.
 */
function updateFirefoxMediaMetadata(data: RadioData): void {
	const session = getFirefoxMediaSession();

	if (!session) {
		return;
	}

	const albumImage = data.song.albums[0]?.image;
	session.metadata = new MediaMetadata({
		title: data.song.title,
		artist: data.song.artists.map(a => a.nameRomaji ?? a.name).join(', '),
		artwork: albumImage
			? [{ src: `https://cdn.listen.moe/covers/${albumImage}`, sizes: '512x512', type: 'image/jpeg' }]
			: [],
	});
}

/**
 * Sets the Media Session playback state to playing or paused.
 */
function updateFirefoxMediaPlaybackState(playing: boolean): void {
	const session = getFirefoxMediaSession();

	if (!session) {
		return;
	}

	session.playbackState = playing ? 'playing' : 'paused';
}

/**
 * Sets a custom User-Agent header on requests to listen.moe.
 * Firefox: uses webRequest (MV2). Chrome: uses declarativeNetRequest (MV3).
 */
function setupUserAgentModification(): void {
	const manifest = browser.runtime.getManifest();
	const browserName = import.meta.env.FIREFOX ? 'Firefox' : 'Chrome';
	const userAgent = `${manifest.name} ${browserName} Extension v${manifest.version}`;

	if (import.meta.env.FIREFOX) {
		// Firefox MV2: use webRequest, only modify requests from the extension (tabId === -1)
		browser.webRequest.onBeforeSendHeaders.addListener(details => {
			if (details.tabId !== -1) {
				return {};
			}

			const headers = (details.requestHeaders ?? []).map(header => {
				return header.name.toLowerCase() === 'user-agent' ? { ...header, value: userAgent } : header;
			});

			return { requestHeaders: headers };
		}, {
			urls: [
				'*://listen.moe/graphql',
				'*://listen.moe/metadata',
				'*://listen.moe/stream',
				'*://listen.moe/fallback',
				'*://listen.moe/kpop/stream',
				'*://listen.moe/kpop/fallback',
			],
		}, ['blocking', 'requestHeaders']);
	} else {
		// Chrome MV3: use declarativeNetRequest, exclude listen.moe-initiated requests
		void browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [1],
			addRules: [
				{
					id: 1,
					priority: 1,
					action: {
						type: 'modifyHeaders',
						requestHeaders: [
							{
								header: 'User-Agent',
								operation: 'set',
								value: userAgent,
							},
						],
					},
					condition: {
						urlFilter: '||listen.moe/',
						excludedInitiatorDomains: ['listen.moe'],
						resourceTypes: [
							'xmlhttprequest',
							'media',
						],
					},
				},
			],
		});
	}
}
