<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@kreditozrouti/types'
import CourseInfo from '@web/components/courses/CourseInfo.vue'
import UnitSelector from '@web/components/courses/UnitSelector.vue'

interface Props {
	course: CourseWithRelationsDTO
}

defineProps<Props>()
</script>

<template>
	<div class="bg-(--insis-surface-2) p-4">
		<div class="grid gap-6 lg:grid-cols-2">
			<CourseInfo :course="course" />
			<UnitSelector :course="course" />
		</div>
	</div>
</template>
