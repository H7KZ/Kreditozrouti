<script setup lang="ts">
import type { OptimizerCandidateDTO } from '@kreditozrouti/types'
import { scoreTier } from '@kreditozrouti/core/domain/optimizer'
import { formatCandidateReasons } from '@client/utils/scoreReasons'
import { useI18n } from 'vue-i18n'
import TierBadge from './TierBadge.vue'

// Quality tier + localized reasons for one optimizer candidate. Shared by the
// results grid (full + drop-one candidates) and the explorer so all three
// scoring sites present a candidate's quality identically.
defineProps<{ candidate: OptimizerCandidateDTO }>()

const { t } = useI18n()
</script>

<template>
	<div class="flex min-w-0 flex-col gap-1">
		<TierBadge :tier="scoreTier(candidate.score)" class="self-start" />
		<span class="text-[10px] text-(--insis-text-3)">
			<template v-for="(reason, i) in formatCandidateReasons(candidate, t)" :key="i">
				<span v-if="i > 0"> · </span>
				<span :class="reason.warning ? 'font-medium text-(--insis-warning)' : ''">{{ reason.text }}</span>
			</template>
		</span>
	</div>
</template>
