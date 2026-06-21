<script setup lang="ts">
import { useFiltersStore, useUIStore } from '@client/stores'
import IconCalendar from '~icons/lucide/calendar'
import IconFunnel from '~icons/lucide/funnel'
import IconLayoutGrid from '~icons/lucide/layout-grid'

const uiStore = useUIStore()
const filtersStore = useFiltersStore()
</script>

<template>
  <nav
    class="flex border-t border-(--insis-border) bg-(--insis-surface) pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    :aria-label="$t('common.mainNavigation')"
  >
    <button
      type="button"
      class="flex flex-1 flex-col items-center gap-1 px-2 pt-2 pb-1 transition-colors"
      :class="uiStore.viewMode === 'list' ? 'text-(--insis-blue)' : 'text-(--insis-text-3)'"
      :aria-current="uiStore.viewMode === 'list' ? 'page' : undefined"
      @click="uiStore.switchToListView"
    >
      <IconLayoutGrid class="h-5 w-5" aria-hidden="true" />
      <span class="text-xs font-medium leading-none">{{ $t('pages.courses.courseList') }}</span>
    </button>

    <button
      type="button"
      class="flex flex-1 flex-col items-center gap-1 px-2 pt-2 pb-1 transition-colors"
      :class="uiStore.viewMode === 'timetable' ? 'text-(--insis-blue)' : 'text-(--insis-text-3)'"
      :aria-current="uiStore.viewMode === 'timetable' ? 'page' : undefined"
      @click="uiStore.switchToTimetableView"
    >
      <IconCalendar class="h-5 w-5" aria-hidden="true" />
      <span class="text-xs font-medium leading-none">{{ $t('pages.courses.myTimetable') }}</span>
    </button>

    <button
      type="button"
      class="flex flex-1 flex-col items-center gap-1 px-2 pt-2 pb-1 text-(--insis-text-3) transition-colors"
      :aria-label="$t('common.openFilters')"
      @click="uiStore.toggleMobileFilter"
    >
      <div class="relative">
        <IconFunnel class="h-5 w-5" aria-hidden="true" />
        <span
          v-if="filtersStore.activeFilterCount > 0"
          class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-(--insis-blue)"
          aria-hidden="true"
        />
      </div>
      <span class="text-xs font-medium leading-none">{{ $t('common.filters') }}</span>
    </button>
  </nav>
</template>
