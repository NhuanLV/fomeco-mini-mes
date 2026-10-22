<script setup lang="ts">
import { Chart, registerables, type ChartConfiguration, type ChartType } from 'chart.js'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  type: ChartType
  data: ChartConfiguration['data']
  options?: ChartConfiguration['options']
}>()

Chart.register(...registerables)

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let chart: Chart | null = null

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: props.options,
  })
}

onMounted(render)
watch(() => [props.type, props.data, props.options], render, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <canvas ref="canvas" />
</template>
