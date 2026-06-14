<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import analytics from '@client/analytics'
import { useCourseRefresh } from '@client/composables'
import IconAlertCircle from '~icons/lucide/alert-circle'
import IconCheck from '~icons/lucide/check'
import IconLoader from '~icons/lucide/loader'
import IconRefreshCw from '~icons/lucide/refresh-cw'

const props = defineProps<{ courseId: number }>()

const { t } = useI18n()
const { state, errorMessage, rateLimitCountdown, lastRefreshedAt, dismiss, trigger } = useCourseRefresh(props.courseId)

function onRefreshClick() {
	if (!window.confirm(t('components.courses.CourseRefreshButton.confirmMessage'))) return
	analytics.track('refresh_triggered')
	trigger()
}
</script>

<template>
	<!--
		Stop click AND keyboard events from bubbling to the parent <tr role="button">,
		which would otherwise toggle row expansion on every interaction here.
	-->
	<div class="flex items-center justify-end gap-0.5" @click.stop @keydown.enter.stop @keydown.space.stop>
		<!-- Triggering / Streaming: spinner -->
		<template v-if="state === 'triggering' || state === 'streaming'">
			<div
				class="flex items-center gap-1 text-[11px] text-(--insis-text-3)"
				role="status"
				:aria-label="t('components.courses.CourseRefreshButton.streaming')"
			>
				<IconLoader class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
			</div>
		</template>

		<!-- Done: green check, auto-reverts after 3 s -->
		<template v-else-if="state === 'done'">
			<div
				class="flex items-center gap-0.5 text-[11px] text-(--insis-success)"
				role="status"
				:aria-label="t('components.courses.CourseRefreshButton.done')"
			>
				<IconCheck class="h-3.5 w-3.5" aria-hidden="true" />
			</div>
		</template>

		<!-- Error: red icon, click to dismiss -->
		<template v-else-if="state === 'error'">
			<button
				class="cursor-pointer rounded p-0.5 text-(--insis-danger) transition-colors hover:bg-(--insis-danger-light) focus-visible:ring-1 focus-visible:ring-(--insis-danger) focus-visible:outline-none"
				:title="errorMessage ?? t('components.courses.CourseRefreshButton.error')"
				:aria-label="t('components.courses.CourseRefreshButton.retryAction')"
				@click="dismiss"
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
				<IconRefreshCw class="h-3.5 w-3.5 text-(--insis-text-3)" aria-hidden="true" />
			</button>
		</template>

		<!-- Idle: subtle refresh icon, confirm via browser dialog before triggering -->
		<template v-else>
			<button
				class="cursor-pointer rounded p-0.5 text-(--insis-text-3) transition-all hover:bg-(--insis-surface-2) hover:text-(--insis-text-1) focus-visible:ring-1 focus-visible:ring-(--insis-border) focus-visible:outline-none"
				:title="
					lastRefreshedAt
						? t('components.courses.CourseRefreshButton.tooltipWithTime', {
								time: lastRefreshedAt.toLocaleTimeString(),
							})
						: t('components.courses.CourseRefreshButton.tooltip')
				"
				:aria-label="t('components.courses.CourseRefreshButton.tooltip')"
				@click="onRefreshClick"
			>
				<IconRefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</template>
	</div>
</template>
