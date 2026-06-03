<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import CourseInfo from '@client/components/courses/CourseInfo.vue'
import UnitSelector from '@client/components/courses/UnitSelector.vue'

interface Props {
	course: CourseWithRelationsDTO
}

defineProps<Props>()
</script>

<template>
	<div class="bg-[var(--insis-surface-2)] p-4">
		<div class="grid gap-6 lg:grid-cols-2">
			<CourseInfo :course="course" />
			<UnitSelector :course="course" />
		</div>
	</div>
</template>
