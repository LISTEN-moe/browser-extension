<template>
	<div class="now-playing">
		<div
			ref="titleContainerRef"
			class="scroll-container song-title"
			@mouseenter="titleScroll.onMouseEnter"
			@mouseleave="titleScroll.onMouseLeave"
		>
			<span ref="titleTextRef">
				{{ songTitle }}
				<!-- <a
					v-if="source"
					:href="`https://listen.moe/sources/${source.id}`"
					target="_blank"
					rel="noopener noreferrer"
					class="source-link"
				>[{{ source.nameRomaji ?? source.name }}]</a> -->
			</span>
		</div>

		<div
			ref="artistContainerRef"
			class="scroll-container song-artists"
			@mouseenter="artistScroll.onMouseEnter"
			@mouseleave="artistScroll.onMouseLeave"
		>
			<span ref="artistTextRef">
				<template v-if="artistEntries.length > 0">
					<template v-for="(entry, i) in artistEntries" :key="`${entry.artist.id}-${entry.character?.id ?? 'solo'}`">
						<template v-if="i > 0">, </template>
						<template v-if="entry.character">
							<a
								:href="`https://listen.moe/characters/${entry.character.id}`"
								target="_blank"
								rel="noopener noreferrer"
								class="artist-link"
							>{{ entry.character.nameRomaji ?? entry.character.name }}</a>
							(CV: <a
								:href="`https://listen.moe/artists/${entry.artist.id}`"
								target="_blank"
								rel="noopener noreferrer"
								class="artist-link"
							>{{ entry.artist.nameRomaji ?? entry.artist.name }}</a>)
						</template>
						<a
							v-else
							:href="`https://listen.moe/artists/${entry.artist.id}`"
							target="_blank"
							rel="noopener noreferrer"
							class="artist-link"
						>{{ entry.artist.nameRomaji ?? entry.artist.name }}</a>
					</template>
				</template>
			</span>
		</div>

		<div v-if="event" class="song-meta event">
			♫ {{ event.name }} ♫
		</div>

		<div v-else-if="requester" class="song-meta">
			Requested by
			<a
				:href="`https://listen.moe/u/${requester.username}`"
				target="_blank"
				rel="noopener noreferrer"
				class="requester-link">
				{{ requester.displayName }}
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type Ref } from 'vue';
import type { RadioData, Artist, Character } from '@/types';

const props = defineProps<{
	data: RadioData | null;
}>();

const song = computed(() => props.data?.song ?? null);
const songTitle = computed(() => song.value?.title ?? 'Not playing');
// const source = computed(() => song.value?.sources[0] ?? null);
const requester = computed(() => props.data?.requester ?? null);
const event = computed(() => props.data?.event ?? null);

interface ArtistEntry {
	artist: Artist;
	character: Character | null;
}

const artistEntries = computed((): ArtistEntry[] => {
	if (!song.value) {
		return [];
	}

	const entries: ArtistEntry[] = [];

	for (const artist of song.value.artists) {
		let hasCharacter = false;

		if (song.value.characters?.length) {
			for (const charRef of artist.characters) {
				const fullChar = song.value.characters.find(c => c.id === charRef.id);
				if (fullChar) {
					entries.push({ artist, character: fullChar });
					hasCharacter = true;
				}
			}
		}

		if (!hasCharacter) {
			entries.push({ artist, character: null });
		}
	}

	return entries;
});

/**
 * Creates an auto-scroll controller for a text element that overflows its container.
 * After a 1s delay, scrolls the text left to reveal the overflow, then reverses back
 * after a pause. Repeats on a 10s cycle. Also supports manual scroll on hover.
 *
 * @param containerRef - Ref to the outer container element.
 * @param textRef - Ref to the inner text element that may overflow.
 * @returns Controls: `reset`, `scheduleAutoScroll`, `onMouseEnter`, `onMouseLeave`, `cleanup`.
 */
function createAutoScroll(
	containerRef: Ref<HTMLElement | undefined>,
	textRef: Ref<HTMLElement | undefined>,
) {
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	function getContentWidth(el: HTMLElement): number {
		const cs = getComputedStyle(el);
		return el.offsetWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight);
	}

	function reset(): void {
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		if (textRef.value) {
			textRef.value.style.transition = 'none';
			textRef.value.style.marginLeft = '0px';
		}
	}

	function scheduleAutoScroll(): void {
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		scrollTimeout = setTimeout(runAutoScroll, 1000);
	}

	function runAutoScroll(): void {
		if (!textRef.value || !containerRef.value) {
			return;
		}

		const textWidth = getContentWidth(textRef.value);
		const containerWidth = getContentWidth(containerRef.value);
		if (textWidth <= containerWidth) {
			return;
		}

		const offset = textWidth + 1 - containerWidth;
		const duration = Math.floor((textRef.value.textContent?.length ?? 0) / 10) * 500;

		textRef.value.style.transition = `margin-left ${duration}ms ease-in-out`;
		textRef.value.style.marginLeft = `${-offset}px`;

		scrollTimeout = setTimeout(() => {
			if (!textRef.value) {
				return;
			}

			const reverseDuration = duration / 4;
			textRef.value.style.transition = `margin-left ${reverseDuration}ms ease-in-out`;
			textRef.value.style.marginLeft = '0px';
			scrollTimeout = setTimeout(scheduleAutoScroll, reverseDuration + 10_000);
		}, duration + 3000);
	}

	function onMouseEnter(): void {
		if (!textRef.value || !containerRef.value) {
			return;
		}

		const textWidth = getContentWidth(textRef.value);
		const containerWidth = getContentWidth(containerRef.value);
		if (textWidth <= containerWidth) {
			return;
		}

		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		const offset = textWidth + 1 - containerWidth;
		const duration = Math.floor((textRef.value.textContent?.length ?? 0) / 10) * 500;
		textRef.value.style.transition = `margin-left ${duration}ms ease-in-out`;
		textRef.value.style.marginLeft = `${-offset}px`;
	}

	function onMouseLeave(): void {
		if (!textRef.value) {
			return;
		}

		const duration = Math.floor((textRef.value.textContent?.length ?? 0) / 10) * 500;
		const reverseDuration = duration / 4;
		textRef.value.style.transition = `margin-left ${reverseDuration}ms ease-in-out`;
		textRef.value.style.marginLeft = '0px';
		scrollTimeout = setTimeout(scheduleAutoScroll, reverseDuration + 10_000);
	}

	function cleanup(): void {
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}
	}

	return { reset, scheduleAutoScroll, onMouseEnter, onMouseLeave, cleanup };
}

// Refs and scroll instances for each row
const titleContainerRef = ref<HTMLElement>();
const titleTextRef = ref<HTMLElement>();
const artistContainerRef = ref<HTMLElement>();
const artistTextRef = ref<HTMLElement>();

const titleScroll = createAutoScroll(titleContainerRef, titleTextRef);
const artistScroll = createAutoScroll(artistContainerRef, artistTextRef);

watch(() => props.data?.song.id, () => {
	titleScroll.reset();
	artistScroll.reset();
	titleScroll.scheduleAutoScroll();
	artistScroll.scheduleAutoScroll();
}, { immediate: true });

onUnmounted(() => {
	titleScroll.cleanup();
	artistScroll.cleanup();
});
</script>

<style scoped>
/* Layout */
.now-playing {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Scrollable text rows */
.scroll-container {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.song-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.song-artists {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Links */
.source-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.source-link:hover {
  color: var(--text-primary);
}

.artist-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}

.artist-link:hover {
  color: var(--text-primary);
}

/* Meta row (event / requester) */
.song-meta {
  font-size: 0.68rem;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.song-meta.event {
  color: var(--accent-color);
}

.requester-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.requester-link:hover {
  color: var(--text-primary);
}
</style>
