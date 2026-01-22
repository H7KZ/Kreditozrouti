<script setup lang="ts">
import SelectionWizard from '@client/components/wizard/SelectionWizard.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
	<div class="home-page">
		<div class="hero-section">
			<h1 class="hero-title">{{ t('home.title') }}</h1>
			<p class="hero-subtitle">{{ t('home.subtitle') }}</p>
		</div>

		<SelectionWizard />

		<div class="features-section">
			<h2>{{ t('home.features.title') }}</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">🔍</div>
					<h3>{{ t('home.features.search.title') }}</h3>
					<p>{{ t('home.features.search.description') }}</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">📅</div>
					<h3>{{ t('home.features.timetable.title') }}</h3>
					<p>{{ t('home.features.timetable.description') }}</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">📊</div>
					<h3>{{ t('home.features.plan.title') }}</h3>
					<p>{{ t('home.features.plan.description') }}</p>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.home-page {
	padding-bottom: 40px;
}

.hero-section {
	text-align: center;
	padding: 40px 20px;
	background: linear-gradient(135deg, var(--color-insis-table-header) 0%, white 100%);
	border-bottom: 1px solid #ddd;
	margin: -16px -16px 0;
}

.hero-title {
	font-family: Georgia, serif;
	font-size: 32px;
	color: var(--color-insis-primary-dark);
	margin: 0 0 12px;
}

.hero-subtitle {
	font-size: 16px;
	color: #555;
	margin: 0;
	max-width: 600px;
	margin: 0 auto;
}

.features-section {
	margin-top: 48px;
	padding: 0 16px;
}

.features-section h2 {
	text-align: center;
	font-family: Georgia, serif;
	font-size: 22px;
	color: var(--color-insis-primary);
	margin: 0 0 24px;
}

.features-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 20px;
	max-width: 900px;
	margin: 0 auto;
}

.feature-card {
	background: white;
	border: 1px solid #ddd;
	border-radius: 8px;
	padding: 24px;
	text-align: center;
	transition:
		transform 0.2s,
		box-shadow 0.2s;
}

.feature-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.feature-icon {
	font-size: 36px;
	margin-bottom: 12px;
}

.feature-card h3 {
	font-size: 16px;
	color: #333;
	margin: 0 0 8px;
}

.feature-card p {
	font-size: 13px;
	color: #666;
	margin: 0;
	line-height: 1.5;
}
</style>
