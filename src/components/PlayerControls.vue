<template>
	<div class="controls-row" @wheel.prevent="onWheel">
		<button
			type="button"
			class="play-btn"
			:aria-label="isPlaying ? 'Pause' : 'Play'"
			@click="emit('toggle')"
		>
			<svg class="progress-ring" viewBox="0 0 36 36">
				<circle
					class="progress-ring-bg"
					cx="18"
					cy="18"
					r="17"></circle>
				<circle
					class="progress-ring-fill"
					cx="18"
					cy="18"
					r="17"
					:stroke-dashoffset="progressOffset"
				></circle>
			</svg>

			<svg
				v-if="isPlaying"
				class="play-icon"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<rect
					x="6"
					y="4"
					width="4"
					height="16"></rect>
				<rect
					x="14"
					y="4"
					width="4"
					height="16"></rect>
			</svg>

			<svg
				v-else
				class="play-icon"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<polygon points="6 3 20 12 6 21 6 3"></polygon>
			</svg>
		</button>

		<div class="volume-track">
			<Volume2 :size="13" class="volume-icon" />
			<input
				type="range"
				min="0"
				max="100"
				:value="volume"
				class="volume-slider"
				:style="{ '--volume': `${volume}%` }"
				@input="onVolumeInput"
			>
		</div>

		<span v-if="duration > 0" class="time-text">{{ formatTime(elapsed) }} / {{ formatTime(duration) }}</span>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Volume2 } from '@lucide/vue';
import { formatTime } from '@/composables/useSongProgress';

const props = defineProps<{
	isPlaying: boolean;
	volume: number;
	elapsed: number;
	duration: number;
}>();

const emit = defineEmits<{
	toggle: [];
	setVolume: [volume: number];
}>();

// r=17 matches the SVG circle
const CIRCUMFERENCE = 2 * Math.PI * 17;

const progressOffset = computed(() => {
	if (props.duration <= 0) {
		return CIRCUMFERENCE;
	}

	const progress = props.elapsed / props.duration;
	return CIRCUMFERENCE * (1 - progress);
});

function onVolumeInput(event: Event): void {
	emit('setVolume', Number((event.target as HTMLInputElement).value));
}

function onWheel(event: WheelEvent): void {
	const delta = event.deltaY < 0 ? 2 : -2;
	emit('setVolume', Math.max(0, Math.min(100, props.volume + delta)));
}
</script>

<style scoped>
/* Layout */
.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Play/pause button */
.play-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
  flex-shrink: 0;
  transition: background 0.15s ease;
  padding: 0;
}

.play-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.play-btn:active {
  transform: scale(0.95);
}

.play-icon {
  position: relative;
  z-index: 1;
}

/* Progress ring */
.progress-ring {
  position: absolute;
  inset: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 1;
}

.progress-ring-fill {
  fill: none;
  stroke: var(--accent-color);
  stroke-width: 1.5;
  stroke-dasharray: 106.81;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s ease-in-out;
  opacity: 0.6;
}

/* Volume slider */
.volume-track {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.volume-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.volume-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: transparent;
  min-width: 0;
}

/* Volume slider - browser-specific tracks */
.volume-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  background-image: linear-gradient(
    to right,
    var(--accent-color) var(--volume, 0%),
    transparent var(--volume, 0%)
  );
}

.volume-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  background-image: linear-gradient(
    to right,
    var(--accent-color) var(--volume, 0%),
    transparent var(--volume, 0%)
  );
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-color);
  cursor: pointer;
  margin-top: -4px;
  transition: transform 0.15s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.25);
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: var(--accent-color);
  cursor: pointer;
}

/* Elapsed / duration text */
.time-text {
  font-size: 0.65rem;
  color: var(--text-secondary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
</style>
