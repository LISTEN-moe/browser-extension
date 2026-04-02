import { ref, onMounted, onUnmounted } from 'vue';
import type { RadioState, BackgroundMessage, StateUpdateMessage } from '@/types';

/**
 * Composable that manages the popup's connection to the background script.
 * Opens a port on mount, listens for state updates, and exposes commands
 * (play/pause, volume, type toggle, favorite) that are forwarded via messages.
 */
export function useRadioState() {
	const state = ref<RadioState | null>(null);
	let port: Browser.runtime.Port | null = null;

	/**
	 * Sends a command message to the background script.
	 *
	 * @param message - The command to send.
	 */
	// eslint-disable-next-line unicorn/consistent-function-scoping
	function sendCommand(message: BackgroundMessage): void {
		// eslint-disable-next-line promise/prefer-await-to-then
		browser.runtime.sendMessage(message).catch(console.error);
	}

	/**
	 * Toggles play/pause state.
	 */
	function toggle(): void {
		sendCommand({ target: 'background', type: 'TOGGLE_PLAY' });
	}

	/**
	 * Sets the volume. Applies an optimistic local update for a smoother
	 * slider feel before forwarding to the background script.
	 *
	 * @param volume - Volume level (0–100).
	 */
	function setVolume(volume: number): void {
		if (state.value) {
			state.value = { ...state.value, volume };
		}

		sendCommand({ target: 'background', type: 'SET_VOLUME', volume });
	}

	/**
	 * Toggles between JPOP and KPOP radio.
	 */
	function toggleType(): void {
		sendCommand({ target: 'background', type: 'TOGGLE_TYPE' });
	}

	/**
	 * Toggles the favorite state of the current song.
	 */
	function toggleFavorite(): void {
		sendCommand({ target: 'background', type: 'TOGGLE_FAVORITE' });
	}

	onMounted(() => {
		port = browser.runtime.connect({ name: 'popup' });

		port.onMessage.addListener((message: StateUpdateMessage) => {
			if (message.type === 'STATE_UPDATE') {
				state.value = message.state;
			}
		});

		port.onDisconnect.addListener(() => {
			port = null;
		});
	});

	onUnmounted(() => {
		port?.disconnect();
		port = null;
	});

	return {
		state,
		toggle,
		setVolume,
		toggleType,
		toggleFavorite,
	};
}
