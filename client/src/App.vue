<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import analytics from '@client/analytics'
import Alerts from '@client/components/alert/Alerts.vue'
import AppFooter from '@client/components/common/AppFooter.vue'
import MobileBanner from '@client/components/common/MobileBanner.vue'
import ScreenReaderAnnouncer from '@client/components/common/ScreenReaderAnnouncer.vue'

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
		<MobileBanner />
		<RouterView class="flex-1" />
		<AppFooter />
		<Alerts />
	</div>
</template>
