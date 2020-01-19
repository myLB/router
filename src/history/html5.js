/* @flow */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { START } from '../util/route'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState, supportsPushState } from '../util/push-state'

export class HTML5History extends History {
  constructor (router: Router, base: ?string) {
    super(router, base)

    const expectScroll = router.options.scrollBehavior//滚动行为函数
    const supportsScroll = supportsPushState && expectScroll //在支持pushstate的情况下,支持滚动行为函数

    if (supportsScroll) {
      // 修改浏览记录并为window添加popstate监听事件
      setupScroll()
    }
    // 返回初始页面的完整路径
    const initLocation = getLocation(this.base)
      // 为window添加popstate监听事件,与上面的共存
    window.addEventListener('popstate', e => {
      const current = this.current // 获取当前路由信息

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
      const location = getLocation(this.base) // 返回当前页面的完整路径
        // 当前路径信息为初始时的路径信息 && 当前页面路径为初始路径时结束该函数
      if (this.current === START && location === initLocation) {
        return
      }

      this.transitionTo(location, route => {
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    })
  }

  go (n: number) {
    window.history.go(n)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }
  //为当前路径创建浏览记录或修改浏览记录   true创建  false修改
  ensureURL (push?: boolean) {
    // 不为初始页面时
    if (getLocation(this.base) !== this.current.fullPath) {
      // 返回当前路由的完整路径
      const current = cleanPath(this.base + this.current.fullPath)
        // 根据参数选择是创建浏览记录还是修改浏览记录
      push ? pushState(current) : replaceState(current)
    }
  }
  // 获取当前页面的完整路径
  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}
//返回当前页面的完整路径   路径 + 查询(参数)部分 + 锚点
export function getLocation (base: string): string {
  let path = decodeURI(window.location.pathname)//对当前路径进行解码
    // 去除路径中的基路径,防止重复
  if (base && path.indexOf(base) === 0) {
    path = path.slice(base.length)
  }
  //路径 + 查询(参数)部分 + 锚点
  return (path || '/') + window.location.search/*query*/ + window.location.hash
}
