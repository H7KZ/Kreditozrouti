<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import analytics from '@web/analytics'
import Alerts from '@web/components/alert/Alerts.vue'
import AppFooter from '@web/components/common/AppFooter.vue'
import FeedbackPrompt from '@web/components/common/FeedbackPrompt.vue'
import OnboardingModal from '@web/components/common/OnboardingModal.vue'
import ScreenReaderAnnouncer from '@web/components/common/ScreenReaderAnnouncer.vue'

const { t } = useI18n()

onMounted(() => {
	analytics.init()
})
</script>

<template>
	<div class="flex min-h-screen flex-col">
		<ScreenReaderAnnouncer />
		<a
			href="#main-content"
			class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-(--insis-surface) focus:px-4 focus:py-2 focus:text-(--insis-blue) focus:shadow-lg focus:outline-none"
		>
			{{ t('common.skipToContent') }}
		</a>
		<OnboardingModal />
		<FeedbackPrompt />
		<RouterView class="flex-1" />
		<AppFooter />
		<Alerts />
	</div>
</template>
