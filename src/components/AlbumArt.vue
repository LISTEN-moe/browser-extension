<template>
	<component
		:is="albumUrl ? 'a' : 'div'"
		:href="albumUrl ?? undefined"
		:target="albumUrl ? '_blank' : undefined"
		:rel="albumUrl ? 'noopener noreferrer' : undefined"
		class="album-art"
		:class="{ 'album-link': albumUrl }"
	>
		<Transition name="crossfade" mode="out-in">
			<img
				v-if="coverUrl"
				:key="coverUrl"
				:src="coverUrl"
				alt="Album art"
				class="cover">
			<div v-else key="placeholder" class="placeholder">
				<Music2 :size="28" />
			</div>
		</Transition>
	</component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Music2 } from '@lucide/vue';
import type { Song } from '@/types';

const props = defineProps<{
	song: Song | null;
}>();

const album = computed(() => props.song?.albums[0] ?? null);

const coverUrl = computed(() => {
	const image = album.value?.image;
	return image ? `https://cdn.listen.moe/covers/${image}` : null;
});

const albumUrl = computed(() => {
	const id = album.value?.id;
	return id ? `https://listen.moe/albums/${id}` : null;
});
</script>

<style scoped>
/* Container */
.album-art {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Clickable album link */
.album-link {
  transition: opacity 0.15s;
}

.album-link:hover {
  opacity: 0.8;
}

/* Cover image */
.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Placeholder (no cover) */
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-tertiary);
}

/* Crossfade transition */
.crossfade-enter-active,
.crossfade-leave-active {
  transition: opacity 0.3s ease;
}

.crossfade-enter-from,
.crossfade-leave-to {
  opacity: 0;
}
</style>
