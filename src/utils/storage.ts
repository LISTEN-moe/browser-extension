import type { RadioSettings } from '@/types';

export const DEFAULT_SETTINGS: RadioSettings = {
	volume: 10,
	enableAutoplay: false,
	enableNotifications: true,
	enableEventNotifications: true,
	useFallbackStream: Boolean(import.meta.env.FIREFOX),
	radioType: 'JPOP',
};

/**
 * Retrieves all radio settings from local storage, falling back to
 * {@link DEFAULT_SETTINGS} for any keys that haven't been persisted yet.
 */
export async function getSettings(): Promise<RadioSettings> {
	return browser.storage.local.get<RadioSettings>(DEFAULT_SETTINGS);
}

/**
 * Persists a single radio setting to local storage.
 *
 * @param key - The setting key to update.
 * @param value - The new value for the setting.
 */
export async function setSetting<K extends keyof RadioSettings>(
	key: K,
	value: RadioSettings[K],
): Promise<void> {
	await browser.storage.local.set({ [key]: value });
}
