/* eslint-disable sonarjs/no-empty-collection */
import type { StateUpdateMessage } from '@/types';

/**
 * Set of active popup ports. Managed by the background script's `onConnect` listener.
 */
export const connectedPorts = new Set<Browser.runtime.Port>();

/**
 * Sends a message to all connected popup ports. Automatically removes
 * ports that throw on `postMessage` (i.e. already disconnected).
 *
 * @param message - The state update message to broadcast.
 */
export function broadcastToPopup(message: StateUpdateMessage): void {
	for (const port of connectedPorts) {
		try {
			port.postMessage(message);
		} catch {
			connectedPorts.delete(port);
		}
	}
}
