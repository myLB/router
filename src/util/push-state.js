/* @flow */

import { inBrowser } from './dom'
import { saveScrollPosition } from './scroll'
// 判断是否支持window.history.pushState
export const supportsPushState = inBrowser && (function () {
  const ua = window.navigator.userAgent
  // (Android2.几版本或4.0版本) && 移动端Safari浏览器 && 非Chrome浏览器 && 非Windows手机  则返回false,表示不支持pushState
  if (
    (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 &&
    ua.indexOf('Chrome') === -1 &&
    ua.indexOf('Windows Phone') === -1
  ) {
    return false
  }

  return window.history && 'pushState' in window.history
})()

// use User Timing api (if present) for more accurate key precision
const Time = inBrowser && window.performance && window.performance.now
  ? window.performance
  : Date

let _key: string = genKey()
//获取当前时间
function genKey (): string {
  return Time.now().toFixed(3)
}
// 获取初始化时的时间
export function getStateKey () {
  return _key
}
// 设置时间
export function setStateKey (key: string) {
  _key = key
}

export function pushState (url?: string, replace?: boolean) {
  saveScrollPosition()
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
  try {
    if (replace) {
      history.replaceState({ key: _key }, '', url)
    } else {
      _key = genKey()
      history.pushState({ key: _key }, '', url)
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

export function replaceState (url?: string) {
  pushState(url, true)
}
