/* @flow */

import type VueRouter from './index'
import { resolvePath } from './util/path'
import { assert, warn } from './util/warn'
import { createRoute } from './util/route'
import { fillParams } from './util/params'
import { createRouteMap } from './create-route-map'
import { normalizeLocation } from './util/location'

export type Matcher = {
  match: (raw: RawLocation, current?: Route, redirectedFrom?: Location) => Route;
  addRoutes: (routes: Array<RouteConfig>) => void;
};
/*
  1、处理完所有的路由并生成路由路径集合、路由信息映射集合、路由命名映射信息集合
  2、返回match和addRoutes函数集合对象
*/
export function createMatcher (
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  const { pathList, pathMap, nameMap } = createRouteMap(routes)//返回所有的路由路径、路由信息映射和路由命名映射信息

  function addRoutes (routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }

  function match (
    raw: RawLocation, // 当前页面路径
    currentRoute?: Route, // 未跳转前的路由信息
    redirectedFrom?: Location
  ): Route {
    // 对raw和currentRoute进行解析输出完整路径、query、hash的对象
    const location = normalizeLocation(raw, currentRoute, false, router)
      // 获取路由命名
    const { name } = location
    // 存在命名
    if (name) {
      // 获取该名称的路由信息
      const record = nameMap[name]
        // 不存在提示警告信息
      if (process.env.NODE_ENV !== 'production') {
        warn(record, `Route with name '${name}' does not exist`)
      }
      // 没有相应的路由信息时创建一个该路径的路由信息
      if (!record) return _createRoute(null, location)
        // 获取不可选参数的名字集合
      const paramNames = record.regex.keys
        .filter(key => !key.optional)//选出不带可选的参数'/:foo/:bar?' foo不可选   bar可选
        .map(key => key.name)// 获取参数的名字集合
      // 不存在设置默认值
      if (typeof location.params !== 'object') {
        location.params = {}
      }
      // 循环当前路由params属性并将不可选的参数合并或替换到location.params对象中
      if (currentRoute && typeof currentRoute.params === 'object') {
        for (const key in currentRoute.params) {
          if (!(key in location.params) && paramNames.indexOf(key) > -1) {
            location.params[key] = currentRoute.params[key]
          }
        }
      }
      // 存在该路由命名的路由信息时,对路径进行填充返回完整路径并返回一个新的路由信息对象
      if (record) {
        location.path = fillParams(record.path, location.params, `named route "${name}"`)
        return _createRoute(record, location, redirectedFrom)
      }
    } else if (location.path) {
      // 不存在路由命名但存在路径
      location.params = {}
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i]// 路由路径
        const record = pathMap[path] // 路由信息
         // 路由正则匹配完整路径时创建一个新的路由信息
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location, redirectedFrom)
        }
      }
    }
    // no match 不匹配创建一个该路径的路由信息
    return _createRoute(null, location)
  }

  function redirect (
    record: RouteRecord,
    location: Location
  ): Route {
    const originalRedirect = record.redirect
    let redirect = typeof originalRedirect === 'function'
      ? originalRedirect(createRoute(record, location, null, router))
      : originalRedirect

    if (typeof redirect === 'string') {
      redirect = { path: redirect }
    }

    if (!redirect || typeof redirect !== 'object') {
      if (process.env.NODE_ENV !== 'production') {
        warn(
          false, `invalid redirect option: ${JSON.stringify(redirect)}`
        )
      }
      return _createRoute(null, location)
    }

    const re: Object = redirect
    const { name, path } = re
    let { query, hash, params } = location
    query = re.hasOwnProperty('query') ? re.query : query
    hash = re.hasOwnProperty('hash') ? re.hash : hash
    params = re.hasOwnProperty('params') ? re.params : params

    if (name) {
      // resolved named direct
      const targetRecord = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        assert(targetRecord, `redirect failed: named route "${name}" not found.`)
      }
      return match({
        _normalized: true,
        name,
        query,
        hash,
        params
      }, undefined, location)
    } else if (path) {
      // 1. resolve relative redirect
      const rawPath = resolveRecordPath(path, record)
      // 2. resolve params
      const resolvedPath = fillParams(rawPath, params, `redirect route with path "${rawPath}"`)
      // 3. rematch with existing query and hash
      return match({
        _normalized: true,
        path: resolvedPath,
        query,
        hash
      }, undefined, location)
    } else {
      if (process.env.NODE_ENV !== 'production') {
        warn(false, `invalid redirect option: ${JSON.stringify(redirect)}`)
      }
      return _createRoute(null, location)
    }
  }

  function alias (
    record: RouteRecord,
    location: Location,
    matchAs: string
  ): Route {
    const aliasedPath = fillParams(matchAs, location.params, `aliased route with path "${matchAs}"`)
    const aliasedMatch = match({
      _normalized: true,
      path: aliasedPath
    })
    if (aliasedMatch) {
      const matched = aliasedMatch.matched
      const aliasedRecord = matched[matched.length - 1]
      location.params = aliasedMatch.params
      return _createRoute(aliasedRecord, location)
    }
    return _createRoute(null, location)
  }

  function _createRoute (
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
  }

  return {
    match,
    addRoutes
  }
}

function matchRoute (
  regex: RouteRegExp,//路由路径的正则表达式
  path: string,//完整路径
  params: Object//参数对象
): boolean {
  // 路由正则解析完整路径
  const m = path.match(regex)
  // 不匹配则返回false
  if (!m) {
    return false
      // 匹配但没有参数对象时返回true
  } else if (!params) {
    return true
  }
  // 将路由路径的所有参数合并到params对象中并对*参数的处理
  for (let i = 1, len = m.length; i < len; ++i) {
    const key = regex.keys[i - 1]
    const val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i]
    if (key) {
      // Fix #1994: using * with props: true generates a param named 0
      params[key.name || 'pathMatch'] = val
    }
  }

  return true
}

function resolveRecordPath (path: string, record: RouteRecord): string {
  return resolvePath(path, record.parent ? record.parent.path : '/', true)
}
