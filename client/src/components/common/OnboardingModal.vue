<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import IconX from '~icons/lucide/x'

const { t } = useI18n()

const DISMISSED_KEY = 'kreditozrouti:guide-seen'
const isCzechBrowser = navigator.language.toLowerCase().startsWith('cs')
const alreadySeen = localStorage.getItem(DISMISSED_KEY) === '1'

const visible = ref(!isCzechBrowser && !alreadySeen)

function dismiss() {
	localStorage.setItem(DISMISSED_KEY, '1')
	visible.value = false
}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="visible"
			class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
			@click.self="dismiss"
		>
			<div class="w-full max-w-md rounded-lg bg-(--insis-surface) p-6 shadow-xl">
				<div class="mb-4 flex items-start justify-between gap-4">
					<h2 class="text-lg font-semibold text-(--insis-gray-900)">
						{{ t('guide.onboardingModal.title') }}
					</h2>
					<button type="button" class="insis-btn-text shrink-0" :aria-label="t('common.close')" @click="dismiss">
						<IconX class="h-5 w-5" />
					</button>
				</div>
				<p class="mb-6 text-sm text-(--insis-gray-700)">
					{{ t('guide.onboardingModal.body') }}
				</p>
				<div class="flex flex-col gap-2 sm:flex-row-reverse">
					<RouterLink
						to="/guide/en"
						class="insis-btn-primary text-center text-sm"
						@click="dismiss"
					>
						{{ t('guide.onboardingModal.readGuide') }}
					</RouterLink>
					<button type="button" class="insis-btn-secondary text-sm" @click="dismiss">
						{{ t('guide.onboardingModal.dismiss') }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
