<script setup lang="ts">
import { AlertButton } from '@client/types'
import { onMounted, onUnmounted, ref } from 'vue'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconCheckCircle from '~icons/lucide/check-circle'
import IconInfo from '~icons/lucide/info'
import IconX from '~icons/lucide/x'
import IconXCircle from '~icons/lucide/x-circle'

interface Props {
	customId?: string
	type?: 'info' | 'success' | 'warning' | 'error'
	title?: string
	description?: string
	buttons?: AlertButton[]
	timeout?: number
	index: number
}
const props = withDefaults(defineProps<AlertProps>(), {
	type: 'info',
})

interface Emits {
	(e: 'close', index: number): void
}
const emit = defineEmits<Emits>()

onMounted(() => {
	if (props.timeout && props.timeout > 0) {
		// Schedule auto-dismiss after specified timeout
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

const timeoutRef = ref<ReturnType<typeof setTimeout> | null>(null)

function handleClose() {
	emit('close', props.index)
}

function handleButtonClick(button: AlertButton) {
	button.action()
	emit('close', props.index)
}

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

export type AlertProps = Props
</script>

<template>
	<div :class="['insis-alert', style.panel]" role="alert">
		<div class="flex gap-3">
			<!-- Icon section: Displays appropriate icon based on alert type -->
			<div :class="['shrink-0 text-lg', style.icon]">
				<IconInfo v-if="type === 'info'" class="h-5 w-5" />
				<IconCheckCircle v-else-if="type === 'success'" class="h-5 w-5" />
				<IconAlertTriangle v-else-if="type === 'warning'" class="h-5 w-5" />
				<IconXCircle v-else-if="type === 'error'" class="h-5 w-5" />
			</div>

			<!-- Content section: Title, description, and action buttons -->
			<div class="flex-1 min-w-0">
				<!-- Alert title with type-specific styling -->
				<p v-if="title" :class="['font-medium text-sm', style.title]">
					{{ title }}
				</p>
				<!-- Alert description with secondary text styling -->
				<p v-if="description" class="mt-1 text-sm text-[var(--insis-gray-700)]">
					{{ description }}
				</p>

				<!-- Action buttons: Rendered dynamically with variant-based styling -->
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
				<IconX class="h-4 w-4" />
			</button>
		</div>
	</div>
</template>

<style scoped>
@reference 'tailwindcss';

.insis-alert {
	@apply rounded p-3;
	border: 1px solid var(--insis-panel-border);
	border-left-width: 4px; /* Thicker left border for visual emphasis */
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
