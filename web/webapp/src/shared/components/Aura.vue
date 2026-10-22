<script setup lang="ts">
interface Props {
  variant?: 'dual' | 'default'
  as?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'dual',
  as: 'div',
  disabled: false,
})
</script>

<template>
  <component :is="as" :class="[{ aura: !disabled, 'aura-dual': !disabled && variant === 'dual' }]">
    <slot />
  </component>
</template>

<style scoped>
@property --aura-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes aura {
  to {
    --aura-angle: 360deg;
    transform: translateZ(1px);
  }
}

.aura {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  --aura-padding: 0.125rem;
  --aura-radius: var(--radius-field, var(--ui-radius, 0.375rem));
  padding: var(--aura-padding);
  border-radius: calc(var(--aura-padding) + var(--aura-radius));
  animation: aura var(--tw-duration, 9s) linear infinite;
  background-image: conic-gradient(from var(--aura-angle), transparent 225deg, currentColor);
}

.aura-dual {
  background-image: repeating-conic-gradient(
    from var(--aura-angle),
    transparent 0%,
    transparent 35%,
    currentColor 50%
  );
}

@media (prefers-reduced-motion: reduce) {
  .aura {
    animation-duration: calc(var(--tw-duration, 9s) * 4);
  }
}

.aura:has(> .rounded-full) {
  --aura-radius: 9999px;
  border-radius: 9999px;
}

.aura::before,
.aura::after {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  opacity: 0.7;
  filter: blur(0.25rem);
  background-color: inherit;
  background-image: inherit;
  translate: -50% -50%;
  animation: inherit;
  content: '';
  pointer-events: none;
}

.aura::after {
  opacity: 0.3;
  filter: blur(1rem);
}

.aura :slotted(*) {
  position: relative;
  z-index: 1;
}
</style>
