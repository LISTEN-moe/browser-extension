import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue';
import type { RadioType } from '@/types';

interface MetadataEvent {
	artist: string;
	mount: string;
	started_at: string;
	title: string;
}

const JPOP_MOUNTS = new Set(['/stream', '/fallback']);
const KPOP_MOUNTS = new Set(['/kpop/stream', '/kpop/fallback']);

/**
 * Connects to the LISTEN.moe metadata EventStream to track song progress.
 * Stores `started_at` for both JPOP and KPOP mounts so switching radio types
 * immediately reflects the correct elapsed time without waiting for a new event.
 *
 * @param radioType - Current radio type, determines which mount's `started_at` is used.
 * @param duration - Song duration in seconds, used to clamp elapsed time.
 * @returns Reactive `elapsed` in seconds, clamped to `[0, duration]`.
 */
export function useSongProgress(radioType: Ref<RadioType>, duration: Ref<number>) {
	const jpopStartedAt = ref<Date | null>(null);
	const kpopStartedAt = ref<Date | null>(null);
	const elapsed = ref(0);

	let eventSource: EventSource | null = null;
	let tickInterval: ReturnType<typeof setInterval> | null = null;

	const startedAt = computed(() => radioType.value === 'JPOP' ? jpopStartedAt.value : kpopStartedAt.value);

	/**
	 * Updates `elapsed` based on time since `startedAt`, clamped to `[0, duration]`.
	 */
	function tick(): void {
		if (!startedAt.value || duration.value <= 0) {
			elapsed.value = 0;
			return;
		}

		const elapsedSec = (Date.now() - startedAt.value.getTime()) / 1000;
		elapsed.value = Math.min(Math.max(0, Math.floor(elapsedSec)), duration.value);
	}

	/**
	 * Opens the SSE connection and routes incoming metadata to the appropriate mount ref.
	 */
	function connect(): void {
		eventSource = new EventSource('https://listen.moe/metadata');

		eventSource.addEventListener('metadata', (event: MessageEvent) => {
			try {
				const data: MetadataEvent = JSON.parse(event.data as string);
				const startDate = new Date(data.started_at);

				if (JPOP_MOUNTS.has(data.mount)) {
					jpopStartedAt.value = startDate;
				} else if (KPOP_MOUNTS.has(data.mount)) {
					kpopStartedAt.value = startDate;
				}

				tick();
			} catch {
				// Ignore parse errors
			}
		});
	}

	/**
	 * Closes the SSE connection and stops the tick interval.
	 */
	function disconnect(): void {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}

		if (tickInterval) {
			clearInterval(tickInterval);
			tickInterval = null;
		}
	}

	watch([startedAt, duration], tick);

	onMounted(() => {
		connect();
		tickInterval = setInterval(tick, 1000);
	});

	onUnmounted(disconnect);

	return { elapsed };
}

/**
 * Formats seconds as `m:ss`.
 */
export function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}
