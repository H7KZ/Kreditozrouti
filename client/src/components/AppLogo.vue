<script setup lang="ts">
interface Props {
	size?: 'sm' | 'md' | 'lg'
	variant?: 'full' | 'icon'
}

const { size, variant } = withDefaults(defineProps<Props>(), {
	size: 'md',
	variant: 'full',
})

const sizeClasses = {
	sm: 'h-8',
	md: 'h-12',
	lg: 'h-16',
}

const textSizeClasses = {
	sm: 'text-base',
	md: 'text-xl',
	lg: 'text-2xl',
}

const iconSizeClasses = {
	sm: 'text-lg',
	md: 'text-2xl',
	lg: 'text-3xl',
}
</script>

<template>
	<div :class="['flex items-center gap-3', sizeClasses[size]]">
		<!-- Icon/Symbol -->
		<div class="flex items-center justify-center bg-gradient-to-b from-[#4a7eb8] to-[#2c5a8c] rounded px-3 py-2 shadow-sm">
			<span class="text-white font-bold" :class="iconSizeClasses[size]">K</span>
		</div>

		<!-- Full name (optional) -->
		<span v-if="variant === 'full'" class="font-semibold text-[#2c5a8c]" :class="textSizeClasses[size]">Kreditožrouti</span>
	</div>
</template>
