<template>
  <DayPilotScheduler :config="config" ref="schedulerRef" />
</template>

<script setup lang="ts">
import {DayPilot, DayPilotScheduler} from '@daypilot/daypilot-lite-vue';
import { ref, reactive, onMounted } from 'vue';

const config = reactive({
  locale: "cs-cz",
  timeHeaders: [{"groupBy":"Day","format":"dddd, d MMMM yyyy"},{"groupBy":"Hour"},{"groupBy":"Cell","format":"mm"}],
  scale: "CellDuration",
  cellDuration: 15,
  days: 7,
  startDate: DayPilot.Date.today().firstDayOfWeek(),
  timeRangeSelectedHandling: "Enabled",
  onTimeRangeSelected: async (args) => {
    const scheduler = args.control;
    const modal = await DayPilot.Modal.prompt("Create a new event:", "Event 1");
    scheduler.clearSelection();
    if (modal.canceled) { return; }
    scheduler.events.add({
      start: args.start,
      end: args.end,
      id: DayPilot.guid(),
      resource: args.resource,
      text: modal.result
    });
  },
  eventMoveHandling: "Update",
  onEventMoved: (args) => {
    console.log("Event moved: " + args.e.text());
  },
  eventResizeHandling: "Update",
  onEventResized: (args) => {
    console.log("Event resized: " + args.e.text());
  },
  eventDeleteHandling: "Update",
  onEventDeleted: (args) => {
    console.log("Event deleted: " + args.e.text());
  },
});
const schedulerRef = ref(null);

const loadEvents = () => {
  const events = [
    {
      id: 1,
      start: DayPilot.Date.today().addHours(12),
      end: DayPilot.Date.today().addHours(14),
      text: "Event 1",
      resource: "GA"
    },
    {
      id: 2,
      start: DayPilot.Date.today().addHours(9),
      end: DayPilot.Date.today().addHours(10),
      text: "Event 2",
      resource: "R1"
    }
  ];
  config.events = events;
};

const loadResources = () => {
  const resources = [
    {name: "Resource 1", id: "R1"},
    {name: "Resource 2", id: "R2"},
    {name: "Resource 3", id: "R3"},
    {name: "Resource 4", id: "R4"},
    {name: "Resource 5", id: "R5"},
    {name: "Resource 6", id: "R6"},
    {name: "Resource 7", id: "R7"},
    {name: "Resource 8", id: "R8"}
  ];
  config.resources = resources;
};


onMounted(() => {
  loadEvents();
  loadResources();
});
</script>
