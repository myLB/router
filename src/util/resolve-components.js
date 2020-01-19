/* @flow */

import { _Vue } from '../install'
import { warn, isError } from './warn'

export function resolveAsyncComponents (matched: Array<RouteRecord>/*激活的路由信息*/): Function {
  return (to, from, next) => {
    let hasAsync = false
    let pending = 0
    let error = null

    flatMapComponents(matched, (def, _, match, key) => {
      // if it's a function and doesn't have cid attached,
      // assume it's an async component resolve function.
      // we are not using Vue's default async resolving mechanism because
      // we want to halt the navigation until the incoming component has been
      // resolved.
      if (typeof def === 'function' && def.cid === undefined) {
        // 判断是否为异步加载路由组件时
        hasAsync = true
        pending++

        const resolve = once(resolvedDef => {
          // 判断是否为模块加载
          if (isESModule(resolvedDef)) {
            resolvedDef = resolvedDef.default
          }
          // save resolved on async factory in case it's used elsewhere
          def.resolved = typeof resolvedDef === 'function'
            ? resolvedDef
            : _Vue.extend(resolvedDef)// 创建一个新的vue子类构造函数
          match.components[key] = resolvedDef
          pending--
          if (pending <= 0) {
            next()
          }
        })

        const reject = once(reason => {
          const msg = `Failed to resolve async component ${key}: ${reason}`
          process.env.NODE_ENV !== 'production' && warn(false, msg)
          if (!error) {
            error = isError(reason)
              ? reason
              : new Error(msg)
            next(error)
          }
        })

        let res
        try {
          // 获取异步加载的组件信息
          res = def(resolve, reject)
        } catch (e) {
          reject(e)
        }
        if (res) {
          if (typeof res.then === 'function') {
            res.then(resolve, reject)
          } else {
            // new syntax in Vue 2.3
            const comp = res.component
            if (comp && typeof comp.then === 'function') {
              comp.then(resolve, reject)
            }
          }
        }
      }
    })

    if (!hasAsync) next()
  }
}
// 返回路由信息集合的各个加载组件的封装路由生命周期函数的函数集合 比如:[[fn1,[fn2,fn3]],[fn4,[fn5,fn6]]]
// 返回[fn1,[fn2,fn3],fn4]
export function flatMapComponents (
  matched: Array<RouteRecord>,//路由信息集合
  fn: Function
): Array<?Function> {
  return flatten(matched.map(m => {
    // 返回存在undefined或封装路由生命周期函数的函数集合。类似于多个created函数集合
    return Object.keys(m.components/*该路由信息集合所要加载的组件集合*/).map(key => fn(
      m.components[key],//加载组件的函数 || 组件options
      m.instances[key],//组件实例
      m, key//组件名
    ))
  }))
}
// 对数组进行二维结构
export function flatten (arr: Array<any>): Array<any> {
  return Array.prototype.concat.apply([], arr)
}

const hasSymbol =
  typeof Symbol === 'function' &&
  typeof Symbol.toStringTag === 'symbol'

function isESModule (obj) {
  return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
}

// in Webpack 2, require.ensure now also returns a Promise
// so the resolve/reject functions may get called an extra time
// if the user uses an arrow function shorthand that happens to
// return that Promise.
function once (fn) {
  let called = false
  return function (...args) {
    if (called) return
    called = true
    return fn.apply(this, args)
  }
}
