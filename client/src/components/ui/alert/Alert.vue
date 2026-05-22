<script setup lang="ts">
import type { AlertVariants } from '.'
import type { HTMLAttributes } from 'vue'
import { cn } from '@client/utils/tailwind'
import { alertVariants } from '.'

const props = defineProps<{
	class?: HTMLAttributes['class']
	variant?: AlertVariants['variant']
}>()
</script>

<template>
	<div data-slot="alert" :class="cn(alertVariants({ variant }), props.class)" role="alert">
		<slot />
	</div>
</template>
