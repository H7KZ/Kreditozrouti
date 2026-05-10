<script setup lang="ts">
import { useCourseRefresh } from '@client/composables'
import IconAlertCircle from '~icons/lucide/alert-circle'
import IconCheck from '~icons/lucide/check'
import IconLoader from '~icons/lucide/loader'
import IconRefreshCw from '~icons/lucide/refresh-cw'
import IconX from '~icons/lucide/x'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ courseId: number }>()

const { t } = useI18n()
const { state, errorMessage, rateLimitCountdown, lastRefreshedAt, confirm, cancel, trigger } = useCourseRefresh(props.courseId)
</script>

<template>
	<!--
		Stop click AND keyboard events from bubbling to the parent <tr role="button">,
		which would otherwise toggle row expansion on every interaction here.
	-->
	<div
		class="flex items-center justify-end gap-0.5"
		@click.stop
		@keydown.enter.stop
		@keydown.space.stop
	>
		<!-- Confirming: inline "Refresh? ✓ ✗" -->
		<template v-if="state === 'confirming'">
			<span class="mr-0.5 whitespace-nowrap text-[11px] text-[var(--insis-text-2)]">
				{{ t('components.courses.CourseRefreshButton.confirm') }}
			</span>
			<button
				class="rounded p-0.5 text-green-600 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
				:aria-label="t('components.courses.CourseRefreshButton.confirmAction')"
				@click="trigger"
			>
				<IconCheck class="h-3.5 w-3.5" aria-hidden="true" />
			</button>
			<button
				class="rounded p-0.5 text-[var(--insis-text-3)] transition-colors hover:bg-[var(--insis-surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--insis-border)]"
				:aria-label="t('components.courses.CourseRefreshButton.cancelAction')"
				@click="cancel"
			>
				<IconX class="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</template>

		<!-- Triggering / Streaming: spinner -->
		<template v-else-if="state === 'triggering' || state === 'streaming'">
			<div
				class="flex items-center gap-1 text-[11px] text-[var(--insis-text-3)]"
				role="status"
				:aria-label="t('components.courses.CourseRefreshButton.streaming')"
			>
				<IconLoader class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
			</div>
		</template>

		<!-- Done: green check, auto-reverts after 3 s -->
		<template v-else-if="state === 'done'">
			<div
				class="flex items-center gap-0.5 text-[11px] text-green-600"
				role="status"
				:aria-label="t('components.courses.CourseRefreshButton.done')"
			>
				<IconCheck class="h-3.5 w-3.5" aria-hidden="true" />
			</div>
		</template>

		<!-- Error: red icon, click to dismiss -->
		<template v-else-if="state === 'error'">
			<button
				class="rounded p-0.5 text-red-500 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
				:title="errorMessage ?? t('components.courses.CourseRefreshButton.error')"
				:aria-label="t('components.courses.CourseRefreshButton.retryAction')"
				@click="cancel"
			>
				<IconAlertCircle class="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</template>

		<!-- Rate limited: greyed icon with countdown tooltip -->
		<template v-else-if="state === 'rate_limited'">
			<button
				class="cursor-not-allowed rounded p-0.5 opacity-35"
				disabled
				:title="t('components.courses.CourseRefreshButton.rateLimited', { countdown: rateLimitCountdown })"
				:aria-label="t('components.courses.CourseRefreshButton.rateLimited', { countdown: rateLimitCountdown })"
				:aria-disabled="true"
			>
				<IconRefreshCw class="h-3.5 w-3.5 text-[var(--insis-text-3)]" aria-hidden="true" />
			</button>
		</template>

		<!-- Idle: subtle refresh icon -->
		<template v-else>
			<button
				class="rounded p-0.5 text-[var(--insis-text-3)] opacity-0 transition-all group-hover/row:opacity-100 hover:bg-[var(--insis-surface-2)] hover:text-[var(--insis-text-1)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--insis-border)]"
				:title="
					lastRefreshedAt
						? t('components.courses.CourseRefreshButton.tooltipWithTime', {
								time: lastRefreshedAt.toLocaleTimeString(),
							})
						: t('components.courses.CourseRefreshButton.tooltip')
				"
				:aria-label="t('components.courses.CourseRefreshButton.tooltip')"
				@click="confirm"
			>
				<IconRefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</template>
	</div>
</template>
