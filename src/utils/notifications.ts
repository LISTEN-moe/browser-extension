import type { RadioData } from '@/types';

/**
 * Creates a "Now Playing" browser notification for the current track.
 * On Chrome, includes a favorite toggle button when the user is logged in.
 * On Firefox, artist info is appended to the message body instead
 * (Firefox doesn't support notification buttons).
 *
 * @param data - The current radio data containing song, event, and artist info.
 * @param hasToken - Whether the user is authenticated (enables the favorite button on Chrome).
 * @returns The notification ID.
 */
export async function createNowPlayingNotification(data: RadioData, hasToken: boolean): Promise<string> {
	const artists = data.song.artists
		.map(a => a.nameRomaji ?? a.name)
		.join(', ');

	const title = data.event ? `♫ ${data.event.name}` : 'Now Playing';

	const notificationOptions: Browser.notifications.NotificationCreateOptions = {
		type: 'basic',
		title,
		message: data.song.title,
		iconUrl: data.song.coverData ?? 'icon/128.png',
	};

	if (import.meta.env.FIREFOX) {
		if (artists) {
			notificationOptions.message += `\n${artists}`;
		}
	} else {
		if (artists) {
			notificationOptions.contextMessage = artists;
		}

		if (hasToken) {
			notificationOptions.buttons = [
				{ title: data.song.favorite ? 'Remove from Favorites' : 'Add to Favorites' },
			];
		}
	}

	return browser.notifications.create(`notification_${Date.now()}`, notificationOptions);
}

/**
 * Creates a basic browser notification with the extension icon.
 * Throws if either title or message is empty.
 *
 * @param title - The notification title.
 * @param message - The notification body text.
 * @returns The notification ID.
 * @throws \{Error\} If title or message is empty.
 */
export async function createSimpleNotification(title: string, message: string): Promise<string> {
	if (!title || !message) {
		throw new Error('Notification title and message are required');
	}

	return browser.notifications.create(`notification_${Date.now()}`, {
		type: 'basic',
		title,
		message,
		iconUrl: 'icon/128.png',
	});
}
