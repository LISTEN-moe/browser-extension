import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-vue'],
	manifest: ({ browser }) => {
		const shared = {
			name: 'LISTEN.moe',
			description: 'Anime/Japanese Radio powered by LISTEN.moe!',
			commands: {
				TOGGLE_RADIO: {
					suggested_key: { default: 'Ctrl+Shift+Space' },
					description: 'Toggle Radio',
				},
				NOW_PLAYING_NOTIFICATION: { description: 'Display Now Playing' },
				VOLUME_UP: { description: 'Raise Radio Volume' },
				VOLUME_DOWN: { description: 'Lower Radio Volume' },
			},
		};

		if (browser === 'firefox') {
			return {
				...shared,
				background: { persistent: true },
				permissions: [
					'cookies',
					'storage',
					'notifications',
					'webRequest',
					'webRequestBlocking',
					'*://listen.moe/*',
					'*://*.listen.moe/*',
				],
			};
		}

		return {
			...shared,
			minimum_chrome_version: '116',
			permissions: [
				'cookies',
				'storage',
				'notifications',
				'declarativeNetRequest',
				'offscreen',
			],
			host_permissions: [
				'*://listen.moe/*',
				'*://*.listen.moe/*',
			],
		};
	},
	imports: {
		eslintrc: {
			enabled: 9,
		},
	},
});
