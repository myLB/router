/* @flow */

import Regexp from 'path-to-regexp'
import { cleanPath } from './util/path'
import { assert, warn } from './util/warn'
//返回路由信息、路径以及路由命名映射集合
export function createRouteMap (
  routes: Array<RouteConfig>,//单个路由配置
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>
): {
  pathList: Array<string>;
  pathMap: Dictionary<RouteRecord>;
  nameMap: Dictionary<RouteRecord>;
} {
  // the path list is used to control path matching priority
  const pathList: Array<string> = oldPathList || []
  // $flow-disable-line
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  // $flow-disable-line
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route)
  })

  // ensure wildcard routes are always at the end
    // 循环所有路由的路径信息,如果路径为*则将该路径放到映射集合的最后面
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  return {
    pathList,
    pathMap,
    nameMap
  }
}
// 创建路由信息并收集,对重复的和不符合的提示相应的警告信息
function addRouteRecord (
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,//单个路由配置
  parent?: RouteRecord,//父路由配置信息
  matchAs?: string//路由别名专用
) {
  const { path, name } = route //获取设置的路由名以及路径
  if (process.env.NODE_ENV !== 'production') {
    assert(path != null, `"path" is required in a route configuration.`)
    assert(
      typeof route.component !== 'string',
      `route config "component" for path: ${String(path || name)} cannot be a ` +
      `string id. Use an actual component instead.`
    )
  }

  const pathToRegexpOptions: PathToRegexpOptions = route.pathToRegexpOptions || {} //2.6新增编译正则的选项,path-to-regexp插件的options选项
  const normalizedPath = normalizePath(
    path,
    parent,
    pathToRegexpOptions.strict//是否为严格模式
  )//返回完整的路径

  if (typeof route.caseSensitive === 'boolean') {//使路由匹配区分大小写
    pathToRegexpOptions.sensitive = route.caseSensitive
  }

  const record: RouteRecord = {
    path: normalizedPath,//完整路径
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions), //将路径解析为正则表达式
    components: route.components || { default: route.component },//路径相对应的多个组件或单个组件
    instances: {},//用于缓存路由组件的
    name,//路由的命名
    parent,//父路由信息
    matchAs,//别名原本路由的路径
    redirect: route.redirect,//重定向
    beforeEnter: route.beforeEnter,//进入该路由之前的函数
    meta: route.meta || {},//
    props: route.props == null //向路由组件传递数据
      ? {}
      : route.components //多个组件则传递`props`选项,也就是一一对应
        ? route.props
        : { default: route.props }
  }
  //存在子路由
  if (route.children) {
    // Warn if route is named, does not redirect and has a default child route.
    // If users navigate to this route by name, the default child will
    // not be rendered (GH Issue #629)
    if (process.env.NODE_ENV !== 'production') {
      // 路由已命名&&路由没有重定向 && 子路由路径中存在/字符时
      if (route.name && !route.redirect && route.children.some(child => /^\/?$/.test(child.path))) {
        warn(
          false,
          `Named Route '${route.name}' has a default child route. ` +
          `When navigating to this named route (:to="{name: '${route.name}'"), ` +
          `the default child route will not be rendered. Remove the name from ` +
          `this route and use the name of the default child route for named ` +
          `links instead.`
        )
          /*命名路由'${Route .name}'有一个默认的子路由。
          当导航到这个命名路由(:to="{name: '${route.name}'")时，
          默认的子路由将不会呈现。从此路由中删除该名称，并使用已命名链接的默认子路由的名称。*/
      }
    }
    route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)//返回完整的路径
        : undefined
        //递归处理
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
  }
  // 存在别名,为别名重新创建路由信息,相当于对存在别名的路由重新复制了一份
  if (route.alias !== undefined) {
    // 将别名转化成数组形式
    const aliases = Array.isArray(route.alias)
      ? route.alias
      : [route.alias]

    aliases.forEach(alias => {
      const aliasRoute = {
        path: alias,
        children: route.children
      }
      addRouteRecord(
        pathList,
        pathMap,
        nameMap,
        aliasRoute,
        parent,
        record.path || '/' // matchAs
      )
    })
  }
  // 对所有路由路径和信息进行收集,路径相同的不重复收集
  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }
  // 当路由被命名时，不存在映射集合中的则收集该路由信息;重复命名路由定义将提示警告信息
  if (name) {
    if (!nameMap[name]) {
      nameMap[name] = record
    } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
      warn(
        false,
        `Duplicate named routes definition: ` +
        `{ name: "${name}", path: "${record.path}" }`
      )
    }
  }
}
// 将路径解析为正则表达式
function compileRouteRegex (path: string, pathToRegexpOptions: PathToRegexpOptions): RouteRegExp {
  /*
      const keys = []
      const regexp = pathToRegexp('/foo/:bar', keys)
      // regexp = /^\/foo\/([^\/]+?)\/?$/i
      // keys = [{ name: 'bar', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }]
  */
  const regex = Regexp(path, [], pathToRegexpOptions)// 以上为例子
  if (process.env.NODE_ENV !== 'production') {
    const keys: any = Object.create(null)
    regex.keys.forEach(key => {
      warn(!keys[key.name], `Duplicate param keys in route with path: "${path}"`)
      keys[key.name] = true
    })
  }
  return regex
}
// 返回完整并符合的路径,比如子路由返回 /father/son
function normalizePath (path: string, parent?: RouteRecord, strict?: boolean): string {
  if (!strict) path = path.replace(/\/$/, '')//非严格模式下将字符最后的'/'字符去掉
  if (path[0] === '/') return path //第一个字符为/时对路径不做修改直接返回
  if (parent == null) return path //根路由也就是主页
  return cleanPath(`${parent.path}/${path}`)//将多余的/去掉并返回完整路径
}
