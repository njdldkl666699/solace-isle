<script setup lang="ts">
import { computed } from "vue";
import type { WeeklyMoodPoint } from "../../stores/appStore";

const props = defineProps<{
  data: WeeklyMoodPoint[];
}>();

const chartWidth = 420;
const chartHeight = 180;

const points = computed(() => {
  if (!props.data.length) return "";
  const maxScore = 5;
  const stepX = chartWidth / (props.data.length - 1 || 1);
  return props.data
    .map((item, index) => {
      const x = index * stepX;
      const y = chartHeight - (item.score / maxScore) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");
});

const gradientId = `mood-gradient-${Math.random().toString(36).slice(2, 8)}`;
</script>

<template>
  <div class="chart-card">
    <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="presentation">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#5d82ff" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#5d82ff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <polyline
        v-if="points"
        :points="points"
        fill="none"
        stroke="#5d82ff"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon
        v-if="points"
        :points="`${points} ${chartWidth},${chartHeight} 0,${chartHeight}`"
        :fill="`url(#${gradientId})`"
      />
      <g v-for="(item, index) in data" :key="item.day">
        <circle
          :cx="(chartWidth / (data.length - 1 || 1)) * index"
          :cy="chartHeight - (item.score / 5) * chartHeight"
          r="8"
          fill="#fff"
          stroke="#5d82ff"
          stroke-width="3"
        />
      </g>
    </svg>

    <div class="x-axis">
      <div v-for="item in data" :key="item.day" class="axis-item">
        <span class="day">{{ item.day }}</span>
        <span class="label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  background: linear-gradient(135deg, rgba(93, 130, 255, 0.18), rgba(93, 130, 255, 0.05));
  border-radius: 20px;
  padding: 1.25rem 1.5rem 1.5rem;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(76, 108, 255, 0.08);
}

svg {
  width: 100%;
  height: auto;
}

.x-axis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.axis-item {
  text-align: center;
  font-size: 0.85rem;
  color: #526087;
}

.day {
  font-weight: 600;
  color: #324165;
}

.label {
  display: block;
  margin-top: 0.2rem;
  opacity: 0.7;
}
</style>
