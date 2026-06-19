<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import ThemeToggle from '@client/components/common/ThemeToggle.vue'
</script>

<template>
	<header
		class="flex shrink-0 items-center justify-between border-b border-(--insis-border) bg-(--insis-surface) px-4 py-3 shadow-(--insis-shadow-sm) sm:px-6"
	>
		<RouterLink to="/" class="flex items-center gap-3">
			<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="h-8 w-8 shrink-0 object-contain" />
			<div>
				<div class="text-[15px] font-semibold text-(--insis-blue)">Kreditožrouti</div>
				<div class="text-[11px] text-(--insis-text-3)">Rozvrhovač pro VŠE</div>
			</div>
		</RouterLink>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			<LanguageSwitcher />
		</div>
	</header>
</template>
