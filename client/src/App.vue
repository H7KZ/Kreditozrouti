<script setup lang="ts">
import Alerts from '@client/components/alert/Alerts.vue'
import AppFooter from '@client/components/common/AppFooter.vue'
import ScreenReaderAnnouncer from '@client/components/common/ScreenReaderAnnouncer.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
	<div class="flex min-h-screen flex-col">
		<ScreenReaderAnnouncer />
		<a
			href="#main-content"
			class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[var(--insis-blue)] focus:rounded focus:shadow-lg focus:outline-none"
		>
			{{ t('common.skipToContent') }}
		</a>
		<RouterView class="flex-1" />
		<AppFooter />
		<Alerts />
	</div>
</template>
