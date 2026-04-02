<template>
	<div class="radio-toggle">
		<button
			type="button"
			class="toggle-btn"
			:class="{ active: props.radioType === 'JPOP' }"
			@click="props.radioType !== 'JPOP' && emit('toggle')"
		>
			JPOP
		</button>
		<button
			type="button"
			class="toggle-btn"
			:class="{ active: props.radioType === 'KPOP' }"
			@click="props.radioType !== 'KPOP' && emit('toggle')"
		>
			KPOP
		</button>
	</div>
</template>

<script setup lang="ts">
import type { RadioType } from '@/types';

const props = defineProps<{
	radioType: RadioType;
}>();

const emit = defineEmits<{
	toggle: [];
}>();
</script>

<style scoped>
/* Layout */
.radio-toggle {
  display: flex;
  gap: 6px;
}

/* Toggle buttons */
.toggle-btn {
  padding: 3px 13px;
  border-radius: 9px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  border: 1px solid transparent;
  background: var(--surface-dim);
  color: var(--text-tertiary);
}

.toggle-btn:not(.active):hover {
  color: var(--text-secondary);
}

.toggle-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  color: var(--accent-color);
}
</style>
