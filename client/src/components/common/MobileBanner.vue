<script setup lang="ts">
import { ref } from 'vue'
import IconMonitor from '~icons/lucide/monitor'
import IconX from '~icons/lucide/x'

const DISMISSED_KEY = 'kreditozrouti:mobile-banner-dismissed'
const visible = ref(localStorage.getItem(DISMISSED_KEY) !== 'true')

function dismiss() {
	localStorage.setItem(DISMISSED_KEY, 'true')
	visible.value = false
}
</script>

<template>
	<div v-if="visible" class="flex items-center gap-3 bg-(--insis-blue) px-4 py-3 text-sm text-white md:hidden" role="banner">
		<IconMonitor class="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
		<span class="flex-1">{{ $t('common.mobileBanner.message') }}</span>
		<button type="button" class="shrink-0 opacity-70 transition-opacity hover:opacity-100" :aria-label="$t('common.close')" @click="dismiss">
			<IconX class="h-4 w-4" />
		</button>
	</div>
</template>
