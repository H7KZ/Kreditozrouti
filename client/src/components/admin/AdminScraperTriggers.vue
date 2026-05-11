<script setup lang="ts">
import { useAdminStore } from '@client/stores/admin.store'

const admin = useAdminStore()
</script>

<template>
  <div class="insis-card">
    <h3 class="mb-4 text-base font-semibold text-[var(--insis-text)]">Manual Triggers</h3>
    <div class="flex flex-wrap gap-3">
      <button class="insis-btn insis-btn-primary" @click="admin.runCatalogScrape()">
        Run Course Catalog Scrape
      </button>
      <button class="insis-btn insis-btn-secondary" @click="admin.runStudyPlansScrape()">
        Run Study Plans Scrape
      </button>
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
</style>
