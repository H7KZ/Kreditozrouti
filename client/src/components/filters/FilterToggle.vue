<script setup lang="ts">
/*
 * FilterToggle
 * Simple toggle/checkbox for boolean filters.
 */

interface Props {
	label: string
	checked: boolean
	description?: string
}

interface Emits {
	(e: 'update:checked', value: boolean): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleChange(event: Event) {
	const target = event.target as HTMLInputElement
	emit('update:checked', target.checked)
}
</script>

<template>
	<label class="insis-checkbox-label">
		<input type="checkbox" class="insis-checkbox" :checked="checked" @change="handleChange" />
		<div class="flex-1">
			<span class="text-sm">{{ label }}</span>
			<p v-if="description" class="text-xs text-[var(--insis-gray-500)]">
				{{ description }}
			</p>
		</div>
	</label>
</template>
