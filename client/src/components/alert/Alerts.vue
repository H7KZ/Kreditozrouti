<script setup lang="ts">
import Alert from '@client/components/alert/Alert.vue'
import { useAlertsStore } from '@client/stores'

const alertsStore = useAlertsStore()
</script>

<template>
	<div v-if="alertsStore.alerts.length > 0" class="fixed right-0 bottom-0 z-50 flex w-full max-w-sm flex-col gap-4 p-4">
		<Alert
			v-for="(alert, i) in alertsStore.alerts"
			:key="`alert-${i}`"
			:type="alert.type"
			:title="alert.title"
			:description="alert.description"
			:buttons="alert.buttons"
			:timeout="alert.timeout"
			:index="i"
		/>
	</div>
</template>
