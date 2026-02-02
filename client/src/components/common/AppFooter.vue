<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconExternalLink from '~icons/lucide/external-link'
import IconFileText from '~icons/lucide/file-text'
import IconFingerPrintPattern from '~icons/lucide/fingerprint-pattern'
import IconGithub from '~icons/lucide/github'
import IconMail from '~icons/lucide/mail'

const { t, locale } = useI18n()

const currentYear = new Date().getFullYear()
const appVersion = APP_VERSION

const getComplianceLink = () => {
	const lang = locale.value === 'cs' ? 'cs' : 'en'
	return `/compliance/kreditozrouti-compliance-${lang}.pdf`
}
</script>

<template>
	<footer class="mt-auto border-t border-insis-gray-200 bg-insis-gray-50">
		<div class="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
				<!-- About Section -->
				<div class="lg:col-span-2">
					<h3 class="mb-3 text-lg font-semibold text-insis-blue">
						{{ t('footer.about.title') }}
					</h3>
					<p class="mb-3 text-sm text-insis-gray-700">
						{{ t('footer.about.description') }}
					</p>
					<p class="text-xs text-insis-gray-600">
						{{ t('footer.about.university') }}
					</p>
				</div>

				<!-- Links Section -->
				<div>
					<h3 class="mb-3 text-lg font-semibold text-insis-blue">
						{{ t('footer.links.title') }}
					</h3>
					<ul class="space-y-2 text-sm">
						<li>
							<a
								:href="getComplianceLink()"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center text-left gap-2 text-insis-gray-700 transition-colors hover:text-insis-blue"
							>
								<IconFileText class="h-4 w-4 shrink-0" />
								{{ t('footer.links.compliance') }}
							</a>
						</li>
						<li>
							<a
								href="https://github.com/H7KZ/Kreditozrouti"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center text-left gap-2 text-insis-gray-700 transition-colors hover:text-insis-blue"
							>
								<IconGithub class="h-4 w-4 shrink-0" />
								{{ t('footer.links.github') }}
								<IconExternalLink class="h-3 w-3" />
							</a>
						</li>
						<li>
							<a
								href="https://insis.vse.cz"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center text-left gap-2 text-insis-gray-700 transition-colors hover:text-insis-blue"
							>
								<IconFingerPrintPattern class="h-4 w-4 shrink-0" />
								{{ t('footer.links.insis') }}
								<IconExternalLink class="h-3 w-3 shrink-0" />
							</a>
						</li>
					</ul>
				</div>

				<!-- Contact Section -->
				<div>
					<h3 class="mb-3 text-lg text-left font-semibold text-insis-blue">
						{{ t('footer.contact.title') }}
					</h3>
					<p class="mb-3 text-sm text-left text-insis-gray-700">
						{{ t('footer.contact.description') }}
					</p>
					<a
						href="mailto:support@kreditozrouti.vse.cz"
						class="flex items-center text-left gap-2 text-sm text-insis-gray-700 transition-colors hover:text-insis-blue"
					>
						<IconMail class="h-4 w-4 shrink-0" />
						support@kreditozrouti.cz
					</a>
				</div>
			</div>

			<!-- Divider -->
			<div class="my-6 border-t border-insis-gray-200"></div>

			<!-- Bottom Footer -->
			<div class="flex flex-col items-center justify-between gap-4 text-sm text-insis-gray-600 sm:flex-row">
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
						<span class="text-xs text-insis-gray-400">|</span>
						<span class="text-xs">{{ t('footer.bottom.beta') }}</span>
					</div>
					<p class="text-xs text-insis-gray-500">
						{{ t('footer.bottom.disclaimer') }}
					</p>
				</div>
			</div>
		</div>
	</footer>
</template>
