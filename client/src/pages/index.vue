<script setup lang="ts">
import { Button } from '@client/components/ui/button'
</script>

<route lang="json">
{
	"name": "index"
}
</route>

<template>
	<div class="flex h-full min-h-screen w-full flex-col items-center justify-center gap-32 bg-linear-to-bl from-[#FFFFFF] to-[#DFDFE6] px-16 py-8">
		<div>
			<img src="/logo/kreditozrouti-transparent.png" alt="Kreditožrouti" class="w-40" />
		</div>

		<form class="flex w-full max-w-sm flex-col gap-8" @submit.prevent="() => console.log('hello!')">
			<Button class="w-full cursor-pointer" type="submit"> TODO: this </Button>
		</form>
	</div>
</template>
