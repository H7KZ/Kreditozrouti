<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import IconExternalLink from '~icons/lucide/external-link'
import IconFileText from '~icons/lucide/file-text'
import IconFingerPrintPattern from '~icons/lucide/fingerprint-pattern'
import IconGithub from '~icons/lucide/github'
import IconMail from '~icons/lucide/mail'

const { t } = useI18n()

const currentYear = new Date().getFullYear()
const appVersion = APP_VERSION
</script>

<template>
	<footer class="border-insis-gray-200 bg-insis-gray-50 mt-auto border-t">
		<div class="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
				<!-- About Section -->
				<div class="lg:col-span-2">
					<h3 class="text-insis-blue mb-3 text-lg font-semibold">
						{{ t('footer.about.title') }}
					</h3>
					<p class="text-insis-gray-700 mb-3 text-sm">
						{{ t('footer.about.description') }}
					</p>
					<p class="text-insis-gray-600 text-xs">
						{{ t('footer.about.university') }}
					</p>
				</div>

				<!-- Links Section -->
				<div>
					<h3 class="text-insis-blue mb-3 text-lg font-semibold">
						{{ t('footer.links.title') }}
					</h3>
					<ul class="space-y-2 text-sm">
						<li>
							<RouterLink
								to="/legal/compliance"
								class="text-insis-gray-700 hover:text-insis-blue flex items-center gap-2 text-left transition-colors"
							>
								<IconFileText class="h-4 w-4 shrink-0" aria-hidden="true" />
								{{ t('footer.links.compliance') }}
							</RouterLink>
						</li>
						<li>
							<a
								href="https://github.com/H7KZ/Kreditozrouti"
								target="_blank"
								rel="noopener noreferrer"
								class="text-insis-gray-700 hover:text-insis-blue flex items-center gap-2 text-left transition-colors"
							>
								<IconGithub class="h-4 w-4 shrink-0" aria-hidden="true" />
								{{ t('footer.links.github') }}
								<IconExternalLink class="h-3 w-3" aria-hidden="true" />
							</a>
						</li>
						<li>
							<a
								href="https://insis.vse.cz"
								target="_blank"
								rel="noopener noreferrer"
								class="text-insis-gray-700 hover:text-insis-blue flex items-center gap-2 text-left transition-colors"
							>
								<IconFingerPrintPattern class="h-4 w-4 shrink-0" aria-hidden="true" />
								{{ t('footer.links.insis') }}
								<IconExternalLink class="h-3 w-3 shrink-0" aria-hidden="true" />
							</a>
						</li>
					</ul>
				</div>

				<!-- Contact Section -->
				<div>
					<h3 class="text-insis-blue mb-3 text-left text-lg font-semibold">
						{{ t('footer.contact.title') }}
					</h3>
					<p class="text-insis-gray-700 mb-3 text-left text-sm">
						{{ t('footer.contact.description') }}
					</p>
					<a
						href="mailto:support@kreditozrouti.cz"
						class="text-insis-gray-700 hover:text-insis-blue flex items-center gap-2 text-left text-sm transition-colors"
					>
						<IconMail class="h-4 w-4 shrink-0" aria-hidden="true" />
						support@kreditozrouti.cz
					</a>
				</div>
			</div>

			<!-- Divider -->
			<div class="border-insis-gray-200 my-6 border-t"></div>

			<!-- Bottom Footer -->
			<div class="text-insis-gray-600 flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
				<div class="text-center sm:text-left">
					<p>
						{{ t('footer.bottom.copyright', { year: currentYear }) }}
					</p>
					<p class="mt-1 text-xs">
						{{ t('footer.bottom.license') }}
					</p>
				</div>

				<div class="flex flex-col items-center gap-2 sm:items-end">
					<div class="flex items-center gap-3">
						<span class="text-xs">{{ t('footer.bottom.version', { version: appVersion }) }}</span>
						<span class="text-insis-gray-400 text-xs">|</span>
						<span class="text-xs">{{ t('footer.bottom.beta') }}</span>
					</div>
					<p class="text-insis-gray-500 text-xs">
						{{ t('footer.bottom.disclaimer') }}
					</p>
				</div>
			</div>
		</div>
	</footer>
</template>
