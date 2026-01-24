<script setup lang="ts">
interface Props {
	variant?: 'default' | 'primary' | 'text'
	disabled?: boolean
	type?: 'button' | 'submit' | 'reset'
}

const { variant } = withDefaults(defineProps<Props>(), {
	variant: 'default',
	disabled: false,
	type: 'button',
})

const emit = defineEmits<{
	click: [event: MouseEvent]
}>()

const variantClasses = {
	default: 'insis-btn',
	primary: 'insis-btn-primary',
	text: 'insis-btn-text',
}
</script>

<template>
	<button :type="type" :disabled="disabled" :class="variantClasses[variant]" @click="emit('click', $event)">
		<slot />
	</button>
</template>
