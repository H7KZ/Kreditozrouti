<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function toggleLocale() {
	locale.value = locale.value === 'cs' ? 'en' : 'cs'
}
</script>

<template>
	<header class="insis-header">
		<div class="insis-header-content">
			<!-- Logo and title -->
			<div class="insis-header-brand">
				<img src="/vse-logo.png" alt="VŠE Logo" class="insis-header-logo" onerror="this.style.display='none'" />
				<div class="insis-header-title">
					<h1>Kreditožrouti</h1>
					<p class="insis-header-subtitle">{{ t('app.subtitle') }}</p>
				</div>
			</div>

			<!-- Navigation links -->
			<nav class="insis-header-nav">
				<RouterLink to="/" class="insis-header-link">
					{{ t('nav.home') }}
				</RouterLink>
				<RouterLink to="/courses" class="insis-header-link">
					{{ t('nav.courses') }}
				</RouterLink>
				<a href="https://insis.vse.cz" target="_blank" rel="noopener" class="insis-header-link insis-header-link-external"> InSIS ↗ </a>
			</nav>

			<!-- Language toggle -->
			<div class="insis-header-actions">
				<button @click="toggleLocale" class="insis-header-lang" :title="t('app.switchLanguage')">
					{{ locale === 'cs' ? 'EN' : 'CZ' }}
				</button>
			</div>
		</div>
	</header>
</template>

<style scoped>
.insis-header-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	max-width: 1400px;
	margin: 0 auto;
	padding: 0 16px;
}

.insis-header-brand {
	display: flex;
	align-items: center;
	gap: 12px;
}

.insis-header-logo {
	height: 48px;
	width: auto;
}

.insis-header-title h1 {
	font-size: 22px;
	font-weight: normal;
	margin: 0;
	font-family: Georgia, serif;
}

.insis-header-subtitle {
	font-size: 12px;
	margin: 2px 0 0;
	opacity: 0.9;
}

.insis-header-nav {
	display: flex;
	gap: 24px;
}

.insis-header-link {
	color: var(--color-insis-header-text);
	text-decoration: none;
	font-size: 14px;
	padding: 4px 8px;
	border-radius: 4px;
	transition: background-color 0.15s;
}

.insis-header-link:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

.insis-header-link.router-link-active {
	background-color: rgba(255, 255, 255, 0.15);
	font-weight: 500;
}

.insis-header-link-external {
	opacity: 0.85;
}

.insis-header-actions {
	display: flex;
	align-items: center;
	gap: 12px;
}

.insis-header-lang {
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.3);
	color: var(--color-insis-header-text);
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
	font-weight: 500;
	transition: background-color 0.15s;
}

.insis-header-lang:hover {
	background: rgba(255, 255, 255, 0.2);
}
</style>
