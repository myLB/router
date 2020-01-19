<template>
  <div>
    <h2 class="hello">Hello {{name}} {{ $attrs }}</h2>
  </div>
</template>

<script>

export default {
  props: {
    name: {
      type: String,
      default: 'Vue!'
    }
  },
  data () {
      return {
          list: ['$store.state.activeTab','$route','TabHref','TabOpen','TabClose','$children','打印', '弹框组件', '动作定义组件']//需要修改的
      }
  }
}
</script>
