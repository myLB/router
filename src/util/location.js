/* @flow */

import type VueRouter from '../index'
import { parsePath, resolvePath } from './path'
import { resolveQuery } from './query'
import { fillParams } from './params'
import { warn } from './warn'
import { extend } from './misc'
// 解析raw参数并输出完整路径、query、hash的对象
export function normalizeLocation (
  raw: RawLocation, // 当前页面路径 || 解析过的当前页面路径的信息
  current: ?Route, // 当前路由信息
  append: ?boolean,
  router: ?VueRouter // 路由实例
): Location {
  let next: Location = typeof raw === 'string' ? { path: raw } : raw
  // named target 有路由名或者已经解析过的直接返回
  if (next.name || next._normalized) {
    return next
  }

  // relative params
  // 不存在路径 && 存在参数 && 传递了当前路由信息
  if (!next.path && next.params && current) {
    next = extend({}, next)// 复制一份next对象
    next._normalized = true// 设置_normalized为true,表示已标准化过了
    const params: any = extend(extend({}, current.params), next.params)//合并raw参数和当前路由信息的params属性为一个新对象
      // 当前路由有命名
    if (current.name) {
      next.name = current.name
      next.params = params
        // 存在祖先路由信息
    } else if (current.matched.length) {
      // 获取当前路由信息中的路径
      const rawPath = current.matched[current.matched.length - 1].path
      next.path = fillParams(rawPath, params, `path ${current.path}`) // 返回填充后的路径
    } else if (process.env.NODE_ENV !== 'production') {
      // 相对params导航需要当前路由信息
      warn(false, `relative params navigation requires a current route.`)
    }
    return next // 返回需要跳转页面的路由信息
  }

  const parsedPath = parsePath(next.path || '') // 返回包含路径、query、锚点名的对象
  const basePath = (current && current.path) || '/'// 当前路由的路径信息
    // 返回一个合规的路径
  const path = parsedPath.path
    ? resolvePath(parsedPath.path, basePath, append || next.append) // parsedPath.path以/开头的返回parsedPath.path 比如: /login
    : basePath
    // 返回解析合并过的query
  const query = resolveQuery(
    parsedPath.query,
    next.query,
    router && router.options.parseQuery // 用户自定义的解析query函数
  )
  // 获取hash值
  let hash = next.hash || parsedPath.hash
  if (hash && hash.charAt(0) !== '#') {
    hash = `#${hash}`
  }
  return {
    _normalized: true,
    path,
    query,
    hash
  }
}
