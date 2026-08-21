<script setup lang="ts">
import type { FeedbackThumbs } from '@client/types'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconThumbsDown from '~icons/lucide/thumbs-down'
import IconThumbsUp from '~icons/lucide/thumbs-up'
import IconX from '~icons/lucide/x'
import { useFeedbackStore } from '@client/stores'

const { t } = useI18n()
const feedbackStore = useFeedbackStore()

// Chosen sentiment lives in local state until the user submits or closes -
// nothing is reported to analytics on selection alone.
const chosen = ref<FeedbackThumbs | null>(null)

const thumbs: { value: FeedbackThumbs; icon: typeof IconThumbsUp; labelKey: string }[] = [
	{ value: 'up', icon: IconThumbsUp, labelKey: 'feedback.thumbsUp' },
	{ value: 'down', icon: IconThumbsDown, labelKey: 'feedback.thumbsDown' }
]

function choose(thumbs: FeedbackThumbs) {
	chosen.value = thumbs
}

function submit() {
	if (!chosen.value) return
	feedbackStore.submit({ thumbs: chosen.value })
}

function close() {
	// Closing after a thumb was chosen still reports that partial sentiment;
	// closing with no thumb chosen reports nothing.
	if (chosen.value) feedbackStore.submit({ thumbs: chosen.value })
	else feedbackStore.dismiss()
}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="feedbackStore.visible"
			class="fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
			role="dialog"
			aria-modal="false"
			:aria-label="t('feedback.title')"
		>
			<div class="rounded-t-lg border border-(--insis-border) bg-(--insis-surface) p-4 shadow-xl sm:rounded-lg">
				<div class="mb-4 flex items-start justify-between gap-4">
					<h2 class="text-base font-semibold text-(--insis-gray-900)">
						{{ t('feedback.title') }}
					</h2>
					<button type="button" class="insis-btn-text shrink-0" :aria-label="t('common.close')" @click="close">
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<div class="flex items-center justify-center gap-4">
					<button
						v-for="thumb in thumbs"
						:key="thumb.value"
						type="button"
						class="flex h-14 w-14 items-center justify-center rounded-lg border transition-colors"
						:class="
							chosen === thumb.value
								? 'border-(--insis-blue) bg-(--insis-blue)/10 text-(--insis-blue)'
								: 'border-(--insis-border) text-(--insis-gray-700) hover:border-(--insis-blue)'
						"
						:aria-label="t(thumb.labelKey)"
						:aria-pressed="chosen === thumb.value"
						@click="choose(thumb.value)"
					>
						<component :is="thumb.icon" class="h-6 w-6" />
					</button>
				</div>

				<div v-if="chosen" class="mt-4 flex justify-end">
					<button type="button" class="insis-btn-primary text-sm" @click="submit">
						{{ t('feedback.submit') }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
