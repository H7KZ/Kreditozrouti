<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@client/components/ui/alert'
import { Button } from '@client/components/ui/button'
import { useAlertsStore } from '@client/stores/alerts'
import type { Alert as AlertProps } from '@client/types'
import AlertTriangle from '~icons/kz-icons/alert-triangle'
import CircleCheck from '~icons/kz-icons/circle-check'
import Cross from '~icons/kz-icons/cross'
import ExclamationCircle from '~icons/kz-icons/exclamation-circle'
import InfoCircle from '~icons/kz-icons/info-circle'

const alertsStore = useAlertsStore()

const props = withDefaults(defineProps<AlertProps & { index: number }>(), {
	type: 'info',
})
</script>

<template>
	<Alert>
		<div class="flex w-full gap-4">
			<InfoCircle v-if="props.type === 'info'" class="h-6 w-6 shrink-0 text-sky-600" />
			<CircleCheck v-if="props.type === 'success'" class="h-6 w-6 shrink-0 text-lime-600" />
			<AlertTriangle v-if="props.type === 'warning'" class="h-6 w-6 shrink-0 text-amber-600" />
			<ExclamationCircle v-if="props.type === 'error'" class="h-6 w-6 shrink-0 text-rose-700" />
			<div class="flex w-full flex-col gap-2">
				<AlertTitle v-if="props.title">
					<p
						class="font-semibold"
						:class="{
							'text-sky-600': props.type === 'info',
							'text-lime-600': props.type === 'success',
							'text-amber-600': props.type === 'warning',
							'text-rose-700': props.type === 'error',
						}"
						v-html="props.title"
					/>
				</AlertTitle>
				<AlertDescription v-if="props.description">
					<p class="text-sm text-neutral-300" v-html="props.description" />
				</AlertDescription>
				<div class="flex flex-wrap gap-2" v-if="props.buttons && props.buttons.length > 0">
					<Button
						class="cursor-pointer"
						v-for="(button, index) in props.buttons"
						:variant="button.variant || 'secondary'"
						:key="index"
						@click="button.action"
					>
						{{ button.label }}
					</Button>
				</div>
			</div>
			<div class="flex flex-col items-end">
				<Cross class="h-4 w-4 cursor-pointer text-neutral-500 transition-all hover:text-neutral-100" @click="alertsStore.removeAlert(props.index)" />
			</div>
		</div>
	</Alert>
</template>
