<script setup lang="ts">
import type { ButtonVariants } from '.'
import type { HTMLAttributes } from 'vue'
import { type PrimitiveProps } from 'reka-ui'
import { cn } from '@client/utils/tailwind'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
	variant?: ButtonVariants['variant']
	size?: ButtonVariants['size']
	class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
	as: 'button',
})
</script>

<template>
	<Primitive data-slot="button" :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size }), props.class)">
		<slot />
	</Primitive>
</template>
