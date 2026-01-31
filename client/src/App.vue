<script setup lang="ts">
import Alerts from '@client/components/alert/Alerts.vue'
import AppFooter from '@client/components/common/AppFooter.vue'
</script>

<template>
	<div class="flex min-h-screen flex-col">
		<RouterView class="flex-1" />
		<AppFooter />
		<Alerts />
	</div>
</template>
