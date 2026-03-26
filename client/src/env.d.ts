declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue-echarts' {
  import type { DefineComponent } from 'vue'
  export const VChart: DefineComponent<any, any, any>
}