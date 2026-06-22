<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useScheduleSlotsStore } from '@client/stores/schedule-slots.store'
import { useTimetableStore } from '@client/stores/timetable.store'
import IconInfo from '~icons/lucide/info'
import IconPencil from '~icons/lucide/pencil'
import IconPlus from '~icons/lucide/plus'
import IconSparkles from '~icons/lucide/sparkles'
import IconX from '~icons/lucide/x'

const { t } = useI18n()
const slotsStore = useScheduleSlotsStore()
const timetableStore = useTimetableStore()

const isAdding = ref(false)
const newSlotName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const editingId = ref<string | null>(null)
const editName = ref('')
const hoveredSlotId = ref<string | null>(null)

let addBlurTimer: ReturnType<typeof setTimeout> | null = null
let renameBlurTimer: ReturnType<typeof setTimeout> | null = null

async function startAdding() {
	if (!slotsStore.canSaveMoreSlots) return
	isAdding.value = true
	newSlotName.value = ''
	await nextTick()
	nameInput.value?.focus()
}

function handleAddBlur() {
	addBlurTimer = setTimeout(confirmAdd, 150)
}

function confirmAdd() {
	if (addBlurTimer) {
		clearTimeout(addBlurTimer)
		addBlurTimer = null
	}
	if (!isAdding.value) return

	const name = newSlotName.value.trim()
	if (!name) {
		isAdding.value = false
		return
	}

	if (slotsStore.activeSlotId) {
		slotsStore.duplicateSlot(slotsStore.activeSlotId, name)
	} else {
		slotsStore.saveCurrentAsSlot(name, timetableStore.selectedUnits)
	}

	isAdding.value = false
}

function cancelAdd() {
	if (addBlurTimer) {
		clearTimeout(addBlurTimer)
		addBlurTimer = null
	}
	isAdding.value = false
}

async function startEditing(slotId: string, currentName: string) {
	editingId.value = slotId
	editName.value = currentName
	await nextTick()
	const el = document.getElementById('edit-input-' + slotId) as HTMLInputElement | null
	if (el) {
		el.focus()
		el.select()
	}
}

function handleRenameBlur() {
	renameBlurTimer = setTimeout(confirmRename, 150)
}

function confirmRename() {
	if (renameBlurTimer) {
		clearTimeout(renameBlurTimer)
		renameBlurTimer = null
	}
	if (!editingId.value) return
	const fallback = t('components.timetable.SchedulePicker.workingCopy')
	slotsStore.renameSlot(editingId.value, editName.value.trim() || fallback)
	editingId.value = null
}

function cancelRename() {
	if (renameBlurTimer) {
		clearTimeout(renameBlurTimer)
		renameBlurTimer = null
	}
	editingId.value = null
}

function confirmDelete(slotId: string) {
	if (window.confirm(t('components.timetable.SchedulePicker.deleteConfirm'))) {
		slotsStore.deleteSlot(slotId)
	}
}

function handleLoadSlot(slotId: string) {
	if (slotsStore.activeSlotId === slotId) return
	if (!slotsStore.activeSlotId && timetableStore.selectedUnits.length > 0) {
		if (!window.confirm(t('components.timetable.SchedulePicker.unsavedChanges'))) return
	}
	slotsStore.loadSlot(slotId)
}

function handlePencilClick(slotId: string) {
	// If tab is not active, select it first, then open rename
	if (slotsStore.activeSlotId !== slotId) {
		slotsStore.loadSlot(slotId)
	}
	const slot = slotsStore.slots.find(s => s.id === slotId)
	if (slot) startEditing(slotId, slot.name)
}

function handleNewSchedule() {
	if (timetableStore.selectedUnits.length > 0) {
		if (!window.confirm(t('components.timetable.SchedulePicker.unsavedChanges'))) return
	}
	slotsStore.clearActiveSlot()
	timetableStore.clearAll()
}

function iconsVisible(slotId: string): boolean {
	return slotsStore.activeSlotId === slotId || hoveredSlotId.value === slotId
}
</script>

<template>
	<div class="mb-6 flex flex-col gap-3">
		<div class="flex shrink-0 flex-wrap items-end justify-between gap-y-1 border-b border-(--insis-border) bg-(--insis-surface) px-1">
			<nav class="insis-tabs min-w-0 flex-1 overflow-x-auto overflow-y-hidden" style="padding-top: 4px">
				<!-- Working Copy Tab -->
				<button v-if="!slotsStore.activeSlotId" type="button" class="insis-tab insis-tab-active gap-2">
					<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-(--insis-blue)"></span>
					{{ t('components.timetable.SchedulePicker.workingCopy') }}
				</button>

				<!-- Saved Slot Tabs -->
				<template v-for="slot in slotsStore.slots" :key="slot.id">
					<!-- Rename mode -->
					<div v-if="editingId === slot.id" class="flex items-center px-2" style="padding-bottom: 7px">
						<input
							:id="'edit-input-' + slot.id"
							v-model="editName"
							type="text"
							class="border-insis-blue w-28 rounded border px-2 py-0.5 text-xs outline-none"
							@blur="handleRenameBlur"
							@keydown.enter.prevent="confirmRename"
							@keydown.esc.prevent="cancelRename"
						/>
					</div>

					<!-- Normal tab button -->
					<button
						v-else
						type="button"
						class="insis-tab flex max-w-[180px] items-center gap-1"
						:class="{ 'insis-tab-active': slotsStore.activeSlotId === slot.id }"
						@mouseenter="hoveredSlotId = slot.id"
						@mouseleave="hoveredSlotId = null"
						@click="handleLoadSlot(slot.id)"
					>
						<!-- Tab label — truncates when long -->
						<span class="min-w-0 flex-1 truncate">{{ slot.name }}</span>

						<!--
							Icons: always in DOM (keeps tab width stable), shown via invisible/visible.
							Ternary ensures only one class is applied at a time — no CSS specificity conflict.
							mousedown.prevent fires before blur so rename/delete takes priority over focus loss.
						-->
						<span :class="iconsVisible(slot.id) ? 'visible' : 'invisible'" class="ml-0.5 flex shrink-0 items-center gap-0.5">
							<span
								class="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:text-(--insis-blue)"
								@mousedown.prevent.stop="handlePencilClick(slot.id)"
							>
								<IconPencil class="h-3 w-3" />
							</span>
							<span
								class="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:text-red-500"
								@mousedown.prevent.stop="confirmDelete(slot.id)"
							>
								<IconX class="h-3.5 w-3.5" />
							</span>
						</span>
					</button>
				</template>
			</nav>

			<!-- Right side: name input or action button -->
			<div class="flex shrink-0 items-center gap-2 px-2 pb-1">
				<div v-if="isAdding" class="flex items-center gap-1">
					<input
						ref="nameInput"
						v-model="newSlotName"
						type="text"
						:placeholder="t('components.timetable.SchedulePicker.saveSchedulePlaceholder')"
						class="border-insis-blue w-32 rounded border px-2 py-1 text-xs outline-none"
						@blur="handleAddBlur"
						@keydown.enter.prevent="confirmAdd"
						@keydown.esc.prevent="cancelAdd"
					/>
				</div>
				<template v-else>
					<button
						v-if="slotsStore.activeSlotId"
						type="button"
						class="insis-btn insis-btn-secondary flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
						@click="handleNewSchedule"
					>
						<IconSparkles class="h-3 w-3 text-amber-500" />
						{{ t('components.timetable.SchedulePicker.newSchedule') }}
					</button>
					<button
						v-if="slotsStore.canSaveMoreSlots"
						type="button"
						class="insis-btn insis-btn-secondary flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
						@click="startAdding"
					>
						<IconPlus class="h-3 w-3" />
						{{
							slotsStore.activeSlotId
								? t('components.timetable.SchedulePicker.newFromCurrent')
								: t('components.timetable.SchedulePicker.saveCurrentSchedule')
						}}
					</button>
				</template>
			</div>
		</div>

		<!-- Empty hint -->
		<div
			v-if="slotsStore.slots.length === 0"
			class="mx-4 flex items-center gap-2 rounded border border-(--insis-border) bg-(--insis-bg) px-4 py-2 text-[11px] text-slate-500"
		>
			<IconInfo class="h-3.5 w-3.5 text-(--insis-blue)" />
			{{ t('components.timetable.SchedulePicker.emptyHint') }}
		</div>
	</div>
</template>
