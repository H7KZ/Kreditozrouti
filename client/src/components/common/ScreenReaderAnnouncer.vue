<script setup lang="ts">
import { useAnnouncerStore } from '@client/stores/announcer.store'

const announcerStore = useAnnouncerStore()
</script>

<template>
	<div class="sr-only" :aria-live="announcerStore.politeness" aria-atomic="true">
		{{ announcerStore.message }}
	</div>
</template>

<style scoped>
/* Ensure it is completely hidden from view but accessible to screen readers */
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
</style>
