<script setup lang="ts">
import { useI18n } from 'vue-i18n'

type Level = 'all' | 'bachelor' | 'master' | 'doctoral'

interface Props {
	modelValue: Level
}

defineProps<Props>()

const emit = defineEmits<{
	'update:modelValue': [value: Level]
}>()

const { t } = useI18n()

const levels: Array<{ value: Level; labelKey: string }> = [
	{ value: 'all', labelKey: 'wizard.levels.all' },
	{ value: 'bachelor', labelKey: 'wizard.levels.bachelor' },
	{ value: 'master', labelKey: 'wizard.levels.master' },
	{ value: 'doctoral', labelKey: 'wizard.levels.doctoral' },
]
</script>

<template>
	<div class="level-filter">
		<label class="block text-sm font-medium text-[#374151] mb-2">
			{{ t('wizard.studyPlan.level') }}
		</label>

		<div class="flex flex-wrap gap-2">
			<button
				v-for="level in levels"
				:key="level.value"
				type="button"
				class="cursor-pointer px-3 py-1.5 text-sm rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#4a7eb8] focus:ring-offset-1"
				:class="{
					'bg-[#4a7eb8] border-[#4a7eb8] text-white': modelValue === level.value,
					'bg-white border-[#d1d5db] text-[#374151] hover:border-[#7b9ebd] hover:bg-[#f9fafb]': modelValue !== level.value,
				}"
				@click="emit('update:modelValue', level.value)"
			>
				{{ t(level.labelKey) }}
			</button>
		</div>
	</div>
</template>
