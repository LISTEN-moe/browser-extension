<template>
	<div class="settings-panel">
		<div class="main-content">
			<!-- Header -->
			<div class="settings-header">
				<button
					type="button"
					class="back-btn"
					title="Back"
					@click="emit('close')">
					<ArrowLeft :size="16" />
				</button>
				<span class="settings-title">Settings</span>
			</div>

			<!-- Settings glass card -->
			<div class="glass-card">
				<div class="settings-list">
					<label class="setting-row">
						<div class="setting-info">
							<span class="setting-name">Autoplay on Browser Start</span>
							<span class="setting-desc">Begin playing radio when the browser starts</span>
						</div>
						<div class="toggle" :class="{ on: enableAutoplay }">
							<input
								v-model="enableAutoplay"
								type="checkbox"
								@change="onSettingChange('enableAutoplay', enableAutoplay)"
							>
							<span class="track"><span class="knob"></span></span>
						</div>
					</label>

					<label class="setting-row">
						<div class="setting-info">
							<span class="setting-name">Song Change Notifications</span>
							<span class="setting-desc">Show a notification when the current song changes</span>
						</div>
						<div class="toggle" :class="{ on: enableNotifications }">
							<input
								v-model="enableNotifications"
								type="checkbox"
								@change="onSettingChange('enableNotifications', enableNotifications)"
							>
							<span class="track"><span class="knob"></span></span>
						</div>
					</label>

					<label class="setting-row">
						<div class="setting-info">
							<span class="setting-name">Event Notifications</span>
							<span class="setting-desc">Notify when a station event is in progress</span>
						</div>
						<div class="toggle" :class="{ on: enableEventNotifications }">
							<input
								v-model="enableEventNotifications"
								type="checkbox"
								@change="onSettingChange('enableEventNotifications', enableEventNotifications)"
							>
							<span class="track"><span class="knob"></span></span>
						</div>
					</label>

					<label class="setting-row">
						<div class="setting-info">
							<span class="setting-name">Use Fallback Stream</span>
							<span class="setting-desc">Use the fallback audio stream (lower quality, wider compatibility)</span>
						</div>
						<div class="toggle" :class="{ on: useFallbackStream }">
							<input
								v-model="useFallbackStream"
								type="checkbox"
								@change="onSettingChange('useFallbackStream', useFallbackStream)"
							>
							<span class="track"><span class="knob"></span></span>
						</div>
					</label>
				</div>
			</div>

			<!-- Keyboard shortcuts (Chrome only) -->
			<button
				type="button"
				class="shortcuts-btn"
				@click="openShortcuts">
				<ExternalLink :size="12" />
				Configure Keyboard Shortcuts
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ArrowLeft, ExternalLink } from '@lucide/vue';
import { DEFAULT_SETTINGS } from '@/utils/storage';
import type { RadioSettings } from '@/types';

const emit = defineEmits<{
	close: [];
}>();

const enableAutoplay = ref(DEFAULT_SETTINGS.enableAutoplay);
const enableNotifications = ref(DEFAULT_SETTINGS.enableNotifications);
const enableEventNotifications = ref(DEFAULT_SETTINGS.enableEventNotifications);
const useFallbackStream = ref(DEFAULT_SETTINGS.useFallbackStream);

onMounted(async () => {
	const items = await browser.storage.local.get<RadioSettings>(DEFAULT_SETTINGS);
	enableAutoplay.value = items.enableAutoplay;
	enableNotifications.value = items.enableNotifications;
	enableEventNotifications.value = items.enableEventNotifications;
	useFallbackStream.value = items.useFallbackStream;
});

function onSettingChange(key: string, value: boolean): void {
	void browser.storage.local.set({ [key]: value });
}

async function openShortcuts(): Promise<void> {
	try {
		if (import.meta.env.FIREFOX) {
			// @ts-expect-error - This is valid on firefox but is not typed for whatever reason.
			await browser.commands.openShortcutSettings();
		} else {
			await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
		}
	} catch (error) {
		console.error(error);
	}
}
</script>

<style scoped>
/* Layout */
.settings-panel {
  position: relative;
  z-index: 1;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: var(--panel-bg);
}

/* Header */
.settings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 4px;
}

.back-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  border-radius: 6px;
  filter: drop-shadow(var(--shadow-text));
  transition: color 0.15s, background 0.15s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.settings-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  text-shadow: var(--shadow-text);
}

/* Settings card */
.glass-card {
  border-radius: 16px;
  background-color: var(--panel-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

/* Settings list */
.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-subtle);
  cursor: pointer;
  transition: background 0.15s;
}

.setting-row:hover {
  background: var(--surface-dim);
}

.setting-row:last-child {
	border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.setting-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 0.7rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Toggle switch */
.toggle {
  position: relative;
  width: 38px;
  height: 22px;
  flex-shrink: 0;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.track {
  position: absolute;
  inset: 0;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.12);
  transition: background 0.2s ease;
  display: block;
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: transform 0.2s ease, background 0.2s ease;
  display: block;
}

.toggle.on .track {
  background: var(--accent-color);
}

.toggle.on .knob {
  transform: translateX(16px);
  background: #fff;
}

/* Shortcuts link */
.shortcuts-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.7rem;
  font-family: inherit;
  text-shadow: var(--shadow-text);
  transition: color 0.15s;
}

.shortcuts-btn:hover {
  color: var(--accent-color);
}
</style>
