<script setup lang="ts">
import Alerts from '@client/components/alert/Alerts.vue'
import Scheduler from '@client/components/scheduler/Scheduler.vue'
</script>

<template>
	<main>
		<RouterView />
			<Scheduler />
		<Alerts />
	</main>
</template>
