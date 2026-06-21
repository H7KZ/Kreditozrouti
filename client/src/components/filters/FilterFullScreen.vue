<script setup lang="ts">
import FilterPanel from '@client/components/filters/FilterPanel.vue'
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top)]">
    <FilterPanel class="flex-1 min-h-0" />
  </div>
</template>
