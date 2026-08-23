<script setup lang="ts">
import type { FeedbackPayload, FeedbackThumbs } from '@client/types'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCookie from '~icons/lucide/cookie'
import IconThumbsDown from '~icons/lucide/thumbs-down'
import IconThumbsUp from '~icons/lucide/thumbs-up'
import IconX from '~icons/lucide/x'
import { useFeedbackStore } from '@client/stores'
import { FEEDBACK_MESSAGE_MAX_LENGTH } from '@client/utils/feedback'

const { t } = useI18n()
const feedbackStore = useFeedbackStore()

const COOKIE_VALUES = [1, 2, 3, 4, 5]

// Chosen sentiment lives in local state until the user submits or closes -
// nothing is reported to analytics on selection alone. The 1-5 rating and the
// comment are optional enrichment; a thumb alone is a complete answer.
const chosen = ref<FeedbackThumbs | null>(null)
const rating = ref<number | null>(null)
const message = ref('')

const thumbs: { value: FeedbackThumbs; icon: typeof IconThumbsUp; labelKey: string }[] = [
	{ value: 'up', icon: IconThumbsUp, labelKey: 'feedback.thumbsUp' },
	{ value: 'down', icon: IconThumbsDown, labelKey: 'feedback.thumbsDown' }
]

function choose(thumbs: FeedbackThumbs) {
	chosen.value = thumbs
}

function setRating(value: number) {
	rating.value = value
}

function buildPayload(thumbs: FeedbackThumbs): FeedbackPayload {
	return { thumbs, rating: rating.value ?? undefined, message: message.value }
}

function submit() {
	if (!chosen.value) return
	feedbackStore.submit(buildPayload(chosen.value))
}

function close() {
	// Closing after a thumb was chosen still reports that partial sentiment
	// (with any rating/comment already entered); closing with no thumb chosen
	// reports nothing.
	if (chosen.value) feedbackStore.submit(buildPayload(chosen.value))
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

				<template v-if="chosen">
					<div class="mt-4">
						<p id="feedback-rating-label" class="mb-2 text-sm text-(--insis-gray-700)">
							{{ t('feedback.ratingScaleLabel') }}
						</p>
						<div class="flex items-center justify-center gap-2" role="group" aria-labelledby="feedback-rating-label">
							<button
								v-for="value in COOKIE_VALUES"
								:key="value"
								type="button"
								class="rounded p-1 transition-colors"
								:class="rating && value <= rating ? 'text-(--insis-blue)' : 'text-(--insis-gray-400) hover:text-(--insis-blue)'"
								:aria-label="t('feedback.cookieLabel', { n: value })"
								:aria-pressed="rating === value"
								@click="setRating(value)"
							>
								<IconCookie class="h-7 w-7" :class="{ 'fill-current': rating && value <= rating }" />
							</button>
						</div>
					</div>

					<div class="mt-4">
						<label for="feedback-comment" class="mb-2 block text-sm text-(--insis-gray-700)">
							{{ t('feedback.commentLabel') }}
						</label>
						<textarea
							id="feedback-comment"
							v-model="message"
							:maxlength="FEEDBACK_MESSAGE_MAX_LENGTH"
							rows="3"
							class="w-full rounded-md border border-(--insis-border) bg-(--insis-surface) p-2 text-sm text-(--insis-gray-900)"
							:placeholder="t('feedback.commentPlaceholder')"
							aria-describedby="feedback-comment-hint"
						/>
						<p id="feedback-comment-hint" class="mt-1 text-xs text-(--insis-gray-500)">
							{{ t('feedback.piiHint') }}
						</p>
					</div>

					<div class="mt-4 flex justify-end">
						<button type="button" class="insis-btn-primary text-sm" @click="submit">
							{{ t('feedback.submit') }}
						</button>
					</div>
				</template>
			</div>
		</div>
	</Teleport>
</template>
