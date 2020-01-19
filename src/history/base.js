/* @flow */

import { _Vue } from '../install'
import type Router from '../index'
import { inBrowser } from '../util/dom'
import { runQueue } from '../util/async'
import { warn, isError } from '../util/warn'
import { START, isSameRoute } from '../util/route'
import {
  flatten,
  flatMapComponents,
  resolveAsyncComponents
} from '../util/resolve-components'

export class History {
  router: Router;
  base: string;
  current: Route;
  pending: ?Route;
  cb: (r: Route) => void;
  ready: boolean;
  readyCbs: Array<Function>;
  readyErrorCbs: Array<Function>;
  errorCbs: Array<Function>;

  // implemented by sub-classes
  +go: (n: number) => void;
  +push: (loc: RawLocation) => void;
  +replace: (loc: RawLocation) => void;
  +ensureURL: (push?: boolean) => void;
  +getCurrentLocation: () => string;

  constructor (router: Router, base: ?string) {
    this.router = router
    this.base = normalizeBase(base) //设置基路径或对基路径规范化
    // start with a route object that stands for "nowhere"
    this.current = START // 创建一个冻结的路径为'/'的路由信息
    this.pending = null
    this.ready = false
    this.readyCbs = []
    this.readyErrorCbs = []
    this.errorCbs = []
  }

  listen (cb: Function) {
    this.cb = cb
  }

  onReady (cb: Function, errorCb: ?Function) {
    if (this.ready) {
      cb()
    } else {
      this.readyCbs.push(cb)
      if (errorCb) {
        this.readyErrorCbs.push(errorCb)
      }
    }
  }

  onError (errorCb: Function) {
    this.errorCbs.push(errorCb)
  }

  transitionTo (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const route = this.router.match(location/*完整的当前路径*/, this.current) //返回一个解析当前路径以及未跳转前的路由信息的全新路由信息
    this.confirmTransition(route, () => {
      this.updateRoute(route)
        // 执行滚动事件
      onComplete && onComplete(route)
        // 修改当前路径修改浏览器记录
      this.ensureURL()

      // fire ready cbs once 执行所有onReady函数收集的回调(路由跳转完成之后执行)
      if (!this.ready) {
        this.ready = true
        this.readyCbs.forEach(cb => { cb(route) })
      }
    }, err => {
      if (onAbort) {
        onAbort(err)
      }
      if (err && !this.ready) {
        this.ready = true
        this.readyErrorCbs.forEach(cb => { cb(err) })
      }
    })
  }

  confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current

    const abort = err => {
      if (isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => { cb(err) })
        } else {
          warn(false, 'uncaught error during route navigation:')
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    // 路由信息相同并且包含当前路由的祖先路由的信息集合的长度相同  什么都没干,也不进行错误提示
    if (
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      route.matched.length === current.matched.length
    ) {
      // 当跳转的路由显示的是同一个页面时
      this.ensureURL()
      return abort()
    }

    const {
      updated,//需要更新的路由信息
      deactivated,//无效的路由信息
      activated//当前激活的路由信息
    } = resolveQueue(this.current.matched/*当前路由的包括其祖先的路由信息*/, route.matched/*将要跳转的路由包括其祖先的路由信息*/)
    // 前后两个路由的所有组件的路由生命周期函数集合以及加载异步组件的函数
    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),//无效的路由的所有组件的beforeRouteLeave的生命周期函数集合
      // global before hooks
      this.router.beforeHooks,//全局定义的beforeEach函数中的fn参数
      // in-component update hooks
      extractUpdateHooks(updated),//当前需要更新的路由的所有组件的beforeRouteUpdate的生命周期函数集合
      // in-config enter guards
      activated.map(m => m.beforeEnter),//当前激活的路由信息记录的beforeEnter生命周期函数集合
      // async components
      resolveAsyncComponents(activated)//返回加载异步组件的函数
    )

    this.pending = route//当前路径的路由信息
      // 执行路由生命周期的遍历器
    // 执行所有的路由生命周期函数以及注册应该激活的组件
    const iterator = (hook: NavigationGuard, next) => {
      // 路由信息发生变化打印错误信息
      if (this.pending !== route) {
        return abort()
      }
      try {
        // 执行生命周期函数  例子: (to, from, next) =>{}    hook === routeEnterGuard、boundRouteGuard
        hook(route/*当前路径的路由信息*/, current/*当前路由信息*/, (to: any) => {
          // next参数传递的是false或者错误信息时，创建一个新的浏览记录并打印错误信息
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(to)
          } else if (
              // 传递了明确的路由跳转信息
            typeof to === 'string' ||
            (typeof to === 'object' && (
              typeof to.path === 'string' ||
              typeof to.name === 'string'
            ))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort()
              // 重定向,重新走一遍transitionTo函数
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
              // 进行下一个生命周期函数
            next(to)
          }
        })
      } catch (e) {
        //打印错误信息
        abort(e)
      }
    }

    runQueue(queue, iterator, () => {
      // 执行完所有路由生命周期函数后的回调函数
      const postEnterCbs = []
      const isValid = () => this.current === route //判断当前路由是否与当前路由的路由信息相同
      // wait until async components are resolved before
        //等到异步组件之前被解析
      // extracting in-component enter guards
        //提取组件内的enter周期函数
      const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
      const queue = enterGuards.concat(this.router.resolveHooks)//添加全局的beforeResolve路由生命周期函数
        // 递归执行beforeRouteEnter生命周期函数
      runQueue(queue, iterator, () => {
          // 执行完所有路由生命周期函数后的回调函数
        if (this.pending !== route) {
          return abort()
        }
        // 初始化
        this.pending = null
        //
        onComplete(route)
          // 存在组件实例
        if (this.router.app) {
          // 当页面重新渲染完之后执行beforeRouteEnter函数的next函数的回调函数参数
          this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => { cb() })
          })
        }
      })
    })
  }

  updateRoute (route: Route) {
    // 获取当前路由信息
    const prev = this.current
      // 将当前路由信息更新为当前路径的路由信息
    this.current = route
      // 执行回调
    this.cb && this.cb(route)
      // 执行路由跳转完毕之后的生命周期函数
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }
}
// 设置基路径 整个单页应用服务在 /app/ 下，然后 base 就应该设为 "/app/"
function normalizeBase (base: ?string): string {
  //未设置基路径
  if (!base) {
    //客户端
    if (inBrowser) {
      // respect <base> tag
      const baseEl = document.querySelector('base')
      base = (baseEl && baseEl.getAttribute('href')) || '/'
      // strip full URL origin
      base = base.replace(/^https?:\/\/[^\/]+/, '')
    } else {
      base = '/'
    }
  }
  // make sure there's the starting slash 确保有开始斜杠
  if (base.charAt(0) !== '/') {
    base = '/' + base
  }
  // remove trailing slash 去除未尾的斜杠
  return base.replace(/\/$/, '')
}
// 当前路由信息和下次要跳转路由信息的对比
function resolveQueue (
  current: Array<RouteRecord>,
  next: Array<RouteRecord>
): {
  updated: Array<RouteRecord>,
  activated: Array<RouteRecord>,
  deactivated: Array<RouteRecord>
} {
  let i
  const max = Math.max(current.length, next.length) // 获取最大值
    // 两者进行对比,直到出现不同的路由信息
  for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break
    }
  }
  return {
    updated: next.slice(0, i),//需要更新的路由信息
    activated: next.slice(i),//当前激活的路由信息
    deactivated: current.slice(i)//无效的路由信息
  }
}
// 返回路由的相应组件的所有路由生命周期函数
function extractGuards (
  records: Array<RouteRecord>,//当前激活状态的路由信息
  name: string,//路由生命周期函数名
  bind: Function,//绑定的函数
  reverse?: boolean // 是否要转换顺序
): Array<?Function> {
  const guards = flatMapComponents(records, (def, instance, match, key) => {//组件构造函数,组件实例,路由信息,组件在路由中的key
    const guard = extractGuard(def, name)//将组件的options和并到vue构造函数的options中
      //存在路由的生命周期构造函数集合或单个返回单个或多个内部执行路由的生命周期函数的函数(对路由的生命周期函数重新封装了一层函数)
    if (guard) {//存在生命周期函数集合
      return Array.isArray(guard)
        ? guard.map(guard => bind(guard, instance, match, key))
        : bind(guard, instance, match, key)
    }
  })
    // 对数组进行二维结构
  return flatten(reverse ? guards.reverse() : guards)
}
//返回组件构造函数options中的路由生命周期函数
function extractGuard (
  def: Object | Function,//组件options或懒加载组件options的函数
  key: string//路由生命周期函数名
): NavigationGuard | Array<NavigationGuard> {
  if (typeof def !== 'function') {
    // extend now so that global mixins are applied.
    def = _Vue.extend(def)
  }
  // 返回路由的生命周期构造函数集合
  return def.options[key]
}
// 收集无效的路由的所有组件的beforeRouteLeave的生命周期函数集合
function extractLeaveGuards (deactivated: Array<RouteRecord>): Array<?Function> {
  return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
}
// 收集当前需要更新的路由的所有组件的beforeRouteUpdate的生命周期函数集合
function extractUpdateHooks (updated: Array<RouteRecord>): Array<?Function> {
  return extractGuards(updated, 'beforeRouteUpdate', bindGuard)
}
// 传递组件实例时返回一个函数内部执行路由的生命周期函数
function bindGuard (guard: NavigationGuard, instance: ?_Vue): ?NavigationGuard {
  if (instance) {
    return function boundRouteGuard () {
      return guard.apply(instance, arguments)
    }
  }
}
// 收集当前激活路由的所有组件的beforeRouteEnter的生命周期函数集合
function extractEnterGuards (
  activated: Array<RouteRecord>,
  cbs: Array<Function>,
  isValid: () => boolean
): Array<?Function> {
  return extractGuards(activated, 'beforeRouteEnter', (guard, _, match, key) => {
    return bindEnterGuard(guard, match, key, cbs, isValid)
  })
}
// 重新封装beforeRouteEnter生命周期函数,该生命周期函数执行完后会对next为函数的参数进行收集,等组件加载完毕时执行该函数
function bindEnterGuard (
  guard: NavigationGuard,//组件中的beforeRouteEnter生命周期函数
  match: RouteRecord,//路由信息记录
  key: string,//组件在路由中的key
  cbs: Array<Function>,//postEnterCbs
  isValid: () => boolean//判断函数
): NavigationGuard {
  return function routeEnterGuard (to, from, next) {
    //beforeRouteEnter (to, from, next)
    return guard(to, from, cb => {
      next(cb)//重定向或执行下一个生命周期函数或警告信息
        // beforeRouteEnter的next函数传递的是个函数 比如: next(fn)
      if (typeof cb === 'function') {
        // 收集beforeRouteEnter函数中next函数的类型为函数的参数
        cbs.push(() => {
          // #750
          // if a router-view is wrapped with an out-in transition,
          // the instance may not have been registered at this time.
          // we will need to poll for registration until current route
          // is no longer valid.
          poll(cb, match.instances, key, isValid)
        })
      }
    })
  }
}
// 不断执行该函数直到存在组件实例时执行用户定义的函数: 比如: next(fn)  执行fn这个函数
function poll (
  cb: any, // somehow flow cannot infer this is a function   next中的函数类型的参数
  instances: Object, // 组件实例集合
  key: string,// 组件对应的key
  isValid: () => boolean// 判断函数
) {
  // 存在组件实例
  if (
    instances[key] &&
    !instances[key]._isBeingDestroyed // do not reuse being destroyed instance
  ) {
    cb(instances[key])//执行该用户定义的函数
  } else if (isValid()) {// 不存在并且当前路由等于当前路径路由时
    setTimeout(() => {
      poll(cb, instances, key, isValid)
    }, 16)
  }
}
