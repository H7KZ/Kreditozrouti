<script setup lang="ts">
import type { SchedulerInfo } from '@api/Controllers/Admin/AdminStatsController'

defineProps<{ schedulers: SchedulerInfo[] }>()

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div class="insis-card">
    <h3 class="mb-4 text-base font-semibold text-[var(--insis-text)]">Schedulers</h3>
    <p v-if="schedulers.length === 0" class="text-sm text-[var(--insis-text-2)]">
      No schedulers active in development
    </p>
    <table v-else class="insis-table insis-table-dense">
      <thead>
        <tr>
          <th>Scheduler ID</th>
          <th>Pattern</th>
          <th>Next Run</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in schedulers" :key="s.id">
          <td>{{ s.id }}</td>
          <td><code>{{ s.pattern }}</code></td>
          <td>{{ formatDate(s.nextRun) }}</td>
        </tr>
      </tbody>
    </table>
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

.insis-table {
  @apply w-full border-collapse;
}

.insis-table-dense {
  @apply text-sm;
}

.insis-table thead {
  @apply bg-[var(--insis-surface-2)] border-b border-[var(--insis-border)];
}

.insis-table th {
  @apply text-left px-3 py-2 font-semibold text-[var(--insis-text)] text-xs;
}

.insis-table tbody tr {
  @apply border-b border-[var(--insis-border)] hover:bg-[var(--insis-surface-2)];
}

.insis-table td {
  @apply px-3 py-2 text-[var(--insis-text-2)];
}

code {
  @apply bg-[var(--insis-surface-2)] px-2 py-1 rounded text-[11px] font-mono;
}
</style>
