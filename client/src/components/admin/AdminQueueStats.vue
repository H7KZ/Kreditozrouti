<script setup lang="ts">
import type { QueueStats } from '@api/Controllers/Admin/AdminStatsController'

interface Props {
  stats: QueueStats
}

defineProps<Props>()

// Badge class mapping for queue statuses
const badgeClasses: Record<keyof QueueStats, string> = {
  active: 'insis-badge-info',
  waiting: 'insis-badge-warning',
  failed: 'insis-badge-danger',
  completed: 'insis-badge-success',
  delayed: 'insis-badge-warning',
  paused: 'insis-badge-gray',
}

// Status labels (can be localized if needed)
const statusLabels: Record<keyof QueueStats, string> = {
  active: 'Active',
  waiting: 'Waiting',
  failed: 'Failed',
  completed: 'Completed',
  delayed: 'Delayed',
  paused: 'Paused',
}
</script>

<template>
  <div class="insis-card">
    <h3 class="mb-4 text-base font-semibold text-[var(--insis-text)]">Request Queue</h3>
    <div class="flex flex-wrap gap-3">
      <div v-for="(status, key) in statusLabels" :key="key" class="flex items-center gap-2">
        <span class="badge" :class="badgeClasses[key as keyof QueueStats]">
          {{ stats[key as keyof QueueStats] }}
        </span>
        <span class="text-xs text-[var(--insis-text-2)]">{{ status }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference 'tailwindcss';

.insis-card {
  @apply rounded-[5px] border border-solid border-[var(--insis-border)] bg-[var(--insis-surface)] p-4;
}

h3 {
  @apply text-base font-semibold;
}

.badge {
  @apply inline-flex items-center gap-[3px] rounded-[10px] px-[6px] py-px text-[11px] font-medium whitespace-nowrap;
}
</style>
