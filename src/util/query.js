/* @flow */

import { warn } from './warn'

const encodeReserveRE = /[!'()*]/g
const encodeReserveReplacer = c => '%' + c.charCodeAt(0).toString(16)
const commaRE = /%2C/g

// fixed encodeURIComponent which is more conformant to RFC3986:
// - escapes [!'()*]
// - preserve commas
const encode = str => encodeURIComponent(str)
  .replace(encodeReserveRE, encodeReserveReplacer)
  .replace(commaRE, ',')

const decode = decodeURIComponent
// 返回解析合并extraQuery后的query
export function resolveQuery (
  query: ?string,// location.search
  extraQuery: Dictionary<string> = {},
  _parseQuery: ?Function //用户自定义的query解析函数
): Dictionary<string> {
  const parse = _parseQuery || parseQuery // 不存在自定义的则使用默认的解析函数
  let parsedQuery
    // 用户自定义的函数需要检测错误以免中断函数执行
  try {
    parsedQuery = parse(query || '')
  } catch (e) {
    process.env.NODE_ENV !== 'production' && warn(false, e.message)
    parsedQuery = {}
  }
  // extraQuery合并或替换到解析后的query对象中
  for (const key in extraQuery) {
    parsedQuery[key] = extraQuery[key]
  }
  return parsedQuery
}
// 解析路径的query以键值对的对象形式返回,并且相同的键的值以数组形式共存
function parseQuery (query: string): Dictionary<string> {
  const res = {}

  query = query.trim().replace(/^(\?|#|&)/, '')//去除开头的?或#或&

  if (!query) {
    return res
  }
  // 将query以&为分割点分割
  query.split('&').forEach(param => {
    const parts = param.replace(/\+/g, ' ').split('=')//将字段的所有+替换成' '并以=为分割点分割
    const key = decode(parts.shift())//对字符解码
    const val = parts.length > 0 //对字符的值进行解码
      ? decode(parts.join('='))
      : null
    // 不存在添加
    if (res[key] === undefined) {
      res[key] = val
        // 数组形式的继续合并
    } else if (Array.isArray(res[key])) {
      res[key].push(val)
    } else {
      // 存在的合为数组
      res[key] = [res[key], val]
    }
  })

  return res
}

export function stringifyQuery (obj: Dictionary<string>): string {
  const res = obj ? Object.keys(obj).map(key => {
    const val = obj[key]

    if (val === undefined) {
      return ''
    }

    if (val === null) {
      return encode(key)
    }

    if (Array.isArray(val)) {
      const result = []
      val.forEach(val2 => {
        if (val2 === undefined) {
          return
        }
        if (val2 === null) {
          result.push(encode(key))
        } else {
          result.push(encode(key) + '=' + encode(val2))
        }
      })
      return result.join('&')
    }

    return encode(key) + '=' + encode(val)
  }).filter(x => x.length > 0).join('&') : null
  return res ? `?${res}` : ''
}
