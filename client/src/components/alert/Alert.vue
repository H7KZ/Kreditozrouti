<script setup lang="ts">
import { AlertButton } from '@client/types'
import { onMounted, onUnmounted, ref } from 'vue'

export interface AlertProps {
	customId?: string
	type?: 'info' | 'success' | 'warning' | 'error'
	title?: string
	description?: string
	buttons?: AlertButton[]
	timeout?: number
	index: number
}

interface Emits {
	(e: 'close', index: number): void
}

const props = withDefaults(defineProps<AlertProps>(), {
	type: 'info',
})
const emit = defineEmits<Emits>()

const timeoutRef = ref<ReturnType<typeof setTimeout> | null>(null)

// Auto-dismiss after timeout
onMounted(() => {
	if (props.timeout && props.timeout > 0) {
		timeoutRef.value = setTimeout(() => {
			emit('close', props.index)
		}, props.timeout)
	}
})

onUnmounted(() => {
	if (timeoutRef.value) {
		clearTimeout(timeoutRef.value)
	}
})

function handleClose() {
	emit('close', props.index)
}

function handleButtonClick(button: AlertButton) {
	button.action()
	emit('close', props.index)
}

// Alert type styling
const alertStyles = {
	info: {
		panel: 'insis-panel-info',
		icon: 'text-[var(--insis-info)]',
		title: 'text-[var(--insis-info)]',
	},
	success: {
		panel: 'insis-panel-success',
		icon: 'text-[var(--insis-success)]',
		title: 'text-[var(--insis-success)]',
	},
	warning: {
		panel: 'insis-panel-warning',
		icon: 'text-[var(--insis-warning)]',
		title: 'text-[var(--insis-gray-900)]',
	},
	error: {
		panel: 'insis-panel-danger',
		icon: 'text-[var(--insis-danger)]',
		title: 'text-[var(--insis-danger)]',
	},
}

const style = alertStyles[props.type]
</script>

<template>
	<div :class="['insis-alert', style.panel]" role="alert">
		<div class="flex gap-3">
			<!-- Icon -->
			<div :class="['shrink-0 text-lg', style.icon]">
				<svg v-if="type === 'info'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
				<svg v-else-if="type === 'success'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<svg v-else-if="type === 'warning'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				<svg v-else-if="type === 'error'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>

			<!-- Content -->
			<div class="flex-1 min-w-0">
				<p v-if="title" :class="['font-medium text-sm', style.title]">
					{{ title }}
				</p>
				<p v-if="description" class="mt-1 text-sm text-[var(--insis-gray-700)]">
					{{ description }}
				</p>

				<!-- Buttons -->
				<div v-if="buttons && buttons.length > 0" class="mt-3 flex flex-wrap gap-2">
					<button
						v-for="(button, idx) in buttons"
						:key="idx"
						type="button"
						:class="[
							'text-xs px-2 py-1',
							button.variant === 'primary' ? 'insis-btn-primary' : button.variant === 'danger' ? 'insis-btn-danger' : 'insis-btn',
						]"
						@click="handleButtonClick(button)"
					>
						{{ button.label }}
					</button>
				</div>
			</div>

			<!-- Close button -->
			<button type="button" class="shrink-0 text-[var(--insis-gray-500)] hover:text-[var(--insis-gray-700)] transition-colors" @click="handleClose">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
</template>

<style scoped>
@reference 'tailwindcss';

.insis-alert {
	@apply rounded p-3;
	border: 1px solid var(--insis-panel-border);
	border-left-width: 4px;
	background-color: white;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.insis-panel-info {
	border-left-color: var(--insis-info);
	background-color: var(--insis-info-bg);
}

.insis-panel-success {
	border-left-color: var(--insis-success);
	background-color: var(--insis-success-light);
}

.insis-panel-warning {
	border-left-color: var(--insis-warning);
	background-color: var(--insis-warning-bg);
}

.insis-panel-danger {
	border-left-color: var(--insis-danger);
	background-color: #fff5f5;
}
</style>
