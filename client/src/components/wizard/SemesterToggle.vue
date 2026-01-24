<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
	modelValue: 'ZS' | 'LS'
	disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
})

const emit = defineEmits<{
	'update:modelValue': [value: 'ZS' | 'LS']
}>()

const { t } = useI18n()

function selectSemester(semester: 'ZS' | 'LS') {
	if (!props.disabled) {
		emit('update:modelValue', semester)
	}
}
</script>

<template>
	<div class="semester-toggle">
		<label class="block text-sm font-medium text-[#374151] mb-2">
			{{ t('wizard.year.semester') }}
		</label>

		<div class="inline-flex rounded-lg border border-[#d1d5db] bg-white p-1" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
			<!-- Winter Semester Button -->
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-150"
				:class="{
					'bg-[#4a7eb8] text-white shadow-sm': modelValue === 'ZS',
					'text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f9fafb]': modelValue !== 'ZS',
					'cursor-pointer': !disabled,
					'cursor-not-allowed': disabled,
				}"
				:disabled="disabled"
				@click="selectSemester('ZS')"
			>
				{{ t('wizard.year.winter') }}
			</button>

			<!-- Summer Semester Button -->
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-150"
				:class="{
					'bg-[#4a7eb8] text-white shadow-sm': modelValue === 'LS',
					'text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f9fafb]': modelValue !== 'LS',
					'cursor-pointer': !disabled,
					'cursor-not-allowed': disabled,
				}"
				:disabled="disabled"
				@click="selectSemester('LS')"
			>
				{{ t('wizard.year.summer') }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.semester-toggle button:focus {
	outline: none;
	ring: 2px;
	ring-color: #4a7eb8;
	ring-offset: 2px;
}
</style>
