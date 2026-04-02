import type { RadioType, WsMessage, WsTrackUpdateData } from '@/types';

export const RADIO_ENDPOINTS = {
	JPOP: {
		stream: 'https://listen.moe/stream',
		fallbackStream: 'https://listen.moe/fallback',
		gateway: 'wss://listen.moe/gateway_v2',
	},
	KPOP: {
		stream: 'https://listen.moe/kpop/stream',
		fallbackStream: 'https://listen.moe/kpop/fallback',
		gateway: 'wss://listen.moe/kpop/gateway_v2',
	},
} as const;

/**
 * Returns the appropriate stream URL for the given radio type,
 * choosing between the primary and fallback stream.
 *
 * @param type - The radio type (JPOP or KPOP).
 * @param useFallback - Whether to use the fallback stream.
 */
export function getStreamUrl(type: RadioType, useFallback: boolean): string {
	const endpoint = RADIO_ENDPOINTS[type];
	return useFallback ? endpoint.fallbackStream : endpoint.stream;
}

// Shorter than the server's 35s default. Exchanging WS messages within
// the 30s activity window keeps the MV3 service worker alive.
const HEARTBEAT_INTERVAL_MS = 20_000;

type TrackUpdateHandler = (data: WsTrackUpdateData) => void;

export class WebSocketManager {
	private ws: WebSocket | null = null;

	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

	private radioType: RadioType = 'JPOP';

	private trackUpdateHandler: TrackUpdateHandler | null = null;

	/**
	 * Sets the radio type without affecting the websocket connection.
	 * Use this before calling {@link connect} to set the initial radio type.
	 * To switch types while connected, use {@link switchType} instead.
	 *
	 * @param type - The radio type to set (JPOP or KPOP).
	 */
	public setRadioType(type: RadioType): void {
		this.radioType = type;
	}

	/**
	 * Registers a callback that fires whenever a `TRACK_UPDATE` or
	 * `TRACK_UPDATE_REQUEST` message is received from the gateway.
	 *
	 * @param handler - The callback to invoke with the track update data.
	 */
	public onTrackUpdate(handler: TrackUpdateHandler): void {
		this.trackUpdateHandler = handler;
	}

	/**
	 * Opens a websocket connection to the LISTEN.moe gateway for the
	 * current radio type. No-ops if a connection is already open or connecting.
	 * Automatically reconnects on unexpected closes after a 5s delay.
	 */
	public connect(): void {
		if (this.ws !== null
			&& (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
			return;
		}

		this.ws = new WebSocket(RADIO_ENDPOINTS[this.radioType].gateway);

		this.ws.onopen = () => {
			console.info('%cWebSocket connection established.', 'color: #ff015b;');
		};

		this.ws.onclose = event => {
			console.info('%cWebSocket closed. Reconnecting...', 'color: #ff015b;', event.reason, event);
			this.stopHeartbeat();
			this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
		};

		this.ws.onerror = event => {
			console.error('WebSocket error:', event);
			this.ws?.close();
		};

		this.ws.onmessage = (event: MessageEvent<string>) => {
			this.handleMessage(event.data);
		};
	}

	/**
	 * Cleanly closes the websocket connection, stops the heartbeat, and
	 * cancels any pending reconnect. Nulls out event handlers to prevent
	 * the `onclose` handler from triggering an automatic reconnect.
	 */
	public disconnect(): void {
		this.stopHeartbeat();

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.onclose = null;
			this.ws.onerror = null;
			this.ws.onmessage = null;
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * Parses an incoming websocket message and routes it by opcode.
	 * Op 0 (hello) starts the heartbeat; op 1 with a track update
	 * event type is forwarded to the registered handler.
	 *
	 * @param raw - The raw JSON string received from the gateway.
	 */
	private handleMessage(raw: string): void {
		if (!raw.length) {
			return;
		}

		let message: WsMessage;

		try {
			message = JSON.parse(raw) as WsMessage;
		} catch {
			console.error('Failed to parse WebSocket message');
			return;
		}

		if (message.op === 0) {
			this.startHeartbeat();
		} else if (message.op === 1) {
			if (message.t !== 'TRACK_UPDATE' && message.t !== 'TRACK_UPDATE_REQUEST') {
				return;
			}

			this.trackUpdateHandler?.(message.d);
		}
	}

	/**
	 * Starts (or restarts) the heartbeat interval that sends op 9 pings
	 * to the gateway. Uses a shorter interval than the server's 35s default
	 * to keep the Chrome MV3 service worker alive.
	 */
	private startHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.heartbeatInterval = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ op: 9 }));
			}
		}, HEARTBEAT_INTERVAL_MS);
	}

	/**
	 * Stops the heartbeat interval and clears the timer reference.
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	/**
	 * Switches to a different radio type by disconnecting and reconnecting
	 * to the new gateway. No-ops if the requested type is already the current type.
	 *
	 * @param type - The radio type to switch to (JPOP or KPOP).
	 */
	public switchType(type: RadioType): void {
		if (this.radioType === type) {
			return;
		}

		console.info('%cClosing WebSocket connection to switch radio type.', 'color: #ff015b;');

		this.radioType = type;
		this.disconnect();
		this.connect();
	}
}
