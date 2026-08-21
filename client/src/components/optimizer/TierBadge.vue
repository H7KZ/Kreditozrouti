<script setup lang="ts">
import type { ScoreTier } from '@kreditozrouti/core/domain/optimizer'
import { useI18n } from 'vue-i18n'

defineProps<{ tier: ScoreTier }>()

const { t } = useI18n()

// Quality ramp green -> blue -> amber -> red, mirroring the status-badge classes
// in insis.css. Bordered pill + always-visible tier word keeps it distinct from
// the borderless fit chips and conveys meaning by label, not colour alone.
const TIER_CLASS: Record<ScoreTier, string> = {
	perfect: 'border-(--insis-success-border) bg-(--insis-success-light) text-(--insis-success)',
	good: 'border-(--insis-blue) bg-(--insis-blue-subtle) text-(--insis-blue)',
	okay: 'border-(--insis-warning-border) bg-(--insis-warning-light) text-(--insis-warning)',
	rough: 'border-(--insis-danger-border) bg-(--insis-danger-light) text-(--insis-danger)'
}
</script>

<template>
	<span
		:class="[
			'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
			TIER_CLASS[tier]
		]"
	>
		{{ t(`components.optimizer.tier.${tier}`) }}
	</span>
</template>
