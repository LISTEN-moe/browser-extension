<template>
	<div class="app" :class="{ kpop: isKpop }">
		<div class="bg-image"></div>

		<SettingsPanel v-if="showSettings" @close="showSettings = false" />

		<div v-else class="main-content">
			<!-- Player card -->
			<div class="player-row">
				<AlbumArt :song="song" />

				<div class="center-section">
					<div class="song-header">
						<NowPlaying :data="state?.data ?? null" />
						<button
							type="button"
							class="icon-btn favorite-btn"
							:class="{
								active: isFavorited,
								'no-token': !hasToken,
							}"
							:title="hasToken ? isFavorited ? 'Unfavorite' : 'Favorite' : 'Log in to favorite'"
							@click="onFavoriteClick"
						>
							<Heart :size="15" :fill="isFavorited ? 'currentColor' : 'none'" />
						</button>
					</div>

					<PlayerControls
						:is-playing="isPlaying"
						:volume="volume"
						:elapsed="elapsed"
						:duration="duration"
						@toggle="toggle"
						@set-volume="setVolume"
					/>
				</div>
			</div>

			<!-- Bottom bar -->
			<div class="bottom-bar">
				<RadioTypeToggle :radio-type="state?.radioType ?? 'JPOP'" @toggle="toggleType" />

				<div class="bottom-right">
					<div v-if="listeners !== null" class="listeners">
						<Headphones :size="12" />
						<span>{{ listeners.toLocaleString() }}</span>
					</div>
					<button
						type="button"
						class="icon-btn settings-btn"
						title="Settings"
						@click="showSettings = true">
						<Settings :size="14" />
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Heart, Headphones, Settings } from '@lucide/vue';
import AlbumArt from '@/components/AlbumArt.vue';
import NowPlaying from '@/components/NowPlaying.vue';
import PlayerControls from '@/components/PlayerControls.vue';
import RadioTypeToggle from '@/components/RadioTypeToggle.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import { useRadioState } from '@/composables/useRadioState';
import { useSongProgress } from '@/composables/useSongProgress';

const { state, toggle, setVolume, toggleType, toggleFavorite } = useRadioState();
const showSettings = ref(false);

const isKpop = computed(() => state.value?.radioType === 'KPOP');
const isPlaying = computed(() => state.value?.isPlaying ?? false);
const volume = computed(() => state.value?.volume ?? 50);
const song = computed(() => state.value?.data?.song ?? null);
const radioType = computed(() => state.value?.radioType ?? 'JPOP');
const duration = computed(() => song.value?.duration ?? 0);
const { elapsed } = useSongProgress(radioType, duration);
const hasToken = computed(() => Boolean(state.value?.token));
const listeners = computed(() => state.value?.data?.listeners ?? null);
const isFavorited = computed(() => song.value?.favorite ?? false);

function onFavoriteClick(): void {
	if (!hasToken.value) {
		window.open('https://listen.moe', '_blank');
		return;
	}

	toggleFavorite();
}
</script>

<!-- Global resets and font -->
<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  text-rendering: optimizeLegibility;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 400px;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
}

body {
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
}
</style>

<style scoped>
/* Theme variables */
.app {
  --accent-color: #ff015b;
  --accent-dim: rgba(255, 1, 91, 0.15);
  --accent-border: rgba(255, 1, 91, 0.3);
  --text-primary: #f0f0f2;
  --text-secondary: #8f92a1;
  --text-tertiary: #565b6e;
  --panel-bg: #1f232db3;
  --surface-subtle: rgba(255, 255, 255, 0.06);
  --surface-dim: rgba(255, 255, 255, 0.04);
  --shadow-text: 0 1px 3px rgba(0, 0, 0, 0.5);

  position: relative;
  display: flex;
  flex-direction: column;
}

.app.kpop {
  --accent-color: #30a9ed;
  --accent-dim: rgba(48, 169, 237, 0.15);
  --accent-border: rgba(48, 169, 237, 0.3);
}

/* Background */
.bg-image {
  position: fixed;
  inset: 0;
  background-image: url('/images/jpop-small.jpg');
  background-size: cover;
  background-position: center;
  z-index: 0;
}

.kpop .bg-image {
  background-image: url('/images/kpop-small.jpg');
  background-position: 70% 90%;
}

/* Main content */
.main-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background-color: var(--panel-bg);
}

/* Player card */
.player-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.center-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.song-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

/* Icon buttons */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.icon-btn:hover {
  color: var(--text-primary);
}

/* Favorite */
.favorite-btn.active {
  color: var(--accent-color);
}

.favorite-btn.active:hover {
  color: var(--accent-color);
  opacity: 0.8;
}

/* "Not logged in" tooltip */
.favorite-btn.no-token {
  position: relative;
}

.favorite-btn.no-token::after {
  content: 'Log in to favorite';
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: #262a36;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.favorite-btn.no-token:hover::after {
  opacity: 1;
}

/* Bottom bar */
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.bottom-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.listeners {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.settings-btn {
  padding: 3px;
}

.settings-btn:hover {
  color: var(--accent-color);
}
</style>
