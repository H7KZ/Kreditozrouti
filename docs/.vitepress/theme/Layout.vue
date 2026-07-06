<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'

const { Layout: VPLayout } = DefaultTheme
</script>

<template>
  <div class="docs-shell">
    <div class="docs-topbar">
      <a href="https://kreditozrouti.cz" class="docs-back-link">← Open Kreditožrouti</a>
      <span class="docs-topbar-name">Kreditožrouti Docs</span>
    </div>
    <VPLayout />
  </div>
</template>
