<script setup lang="ts">
import type { CourseWithRelations } from '@api/Contracts'
import CourseInfo from '@client/components/courses/CourseInfo.vue'
import UnitSelector from '@client/components/courses/UnitSelector.vue'

interface Props {
	course: CourseWithRelations
}

defineProps<Props>()
</script>

<template>
	<div class="p-4 bg-[var(--insis-surface-2)]">
		<div class="grid gap-6 lg:grid-cols-2">
			<CourseInfo :course="course" />
			<UnitSelector :course="course" />
		</div>
	</div>
</template>
