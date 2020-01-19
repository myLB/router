import View from './components/view'
import Link from './components/link'

export let _Vue

export function install (Vue) {
  // 挂载插件
  if (install.installed && _Vue === Vue) return
    // 表示已挂载
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined // 判断是否不为undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }
  // 注册路由或将路由信息绑定到当前激活组件上
  Vue.mixin({
    beforeCreate () {
      // 存在router属性
      if (isDef(this.$options.router)) {
        this._routerRoot = this//组件实例
        this._router = this.$options.router//路由实例
        this._router.init(this)//路由与组件绑定并初始化
          // 为组件添加_route属性并为当前路由信息及其属性添加拦截和收集watcher的能力(主要收集各个组件的渲染函数)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 不存在则设置_routerRoot为父实例或自身
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })
  // $router就是整个路由信息
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })
  // $route就是当前路由信息
  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks  添加合并路由生命周期函数的函数
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
