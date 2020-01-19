/* @flow */
// 返回的一个合规的路径 路由路径 + 相对路径
export function resolvePath (
  relative: string,//相对路径
  base: string,
  append?: boolean
): string {
  const firstChar = relative.charAt(0)
    // 路径的第一个字符为'/'时,返回相对路径
  if (firstChar === '/') {
    return relative
  }
  //路径第一个为?或#时将路由路径和相对路径拼接返回完整路径
  if (firstChar === '?' || firstChar === '#') {
    return base + relative
  }

  const stack = base.split('/')

  // remove trailing segment if:
  // - not appending
  // - appending to trailing slash (last segment is empty)
  if (!append || !stack[stack.length - 1]) {
    stack.pop()//删除最后一个
  }

  // resolve relative path
  const segments = relative.replace(/^\//, '').split('/')//将路径以'/'隔开成数组
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
      // 相对路径中存在'..'删除stack数组中最后一项,'../'表示父路径
    if (segment === '..') {
      stack.pop()
        // 不为'.'时,添加进stack数组中  './'表示当前路径
    } else if (segment !== '.') {
      stack.push(segment)
    }
  }

  // ensure leading slash 确保最前面的斜杠
  if (stack[0] !== '') {
    stack.unshift('')
  }

  return stack.join('/')//合并成完整的路径
}
// 解析路径  返回包含路径、query、锚点名的对象
export function parsePath (path: string): {
  path: string;
  query: string;
  hash: string;
} {
  let hash = ''
  let query = ''

  const hashIndex = path.indexOf('#') // 确认路径中锚点的位置
    // 存在锚点获取hash值和路径
  if (hashIndex >= 0) {
    hash = path.slice(hashIndex)
    path = path.slice(0, hashIndex)
  }

  const queryIndex = path.indexOf('?')
  if (queryIndex >= 0) {
    query = path.slice(queryIndex + 1)
    path = path.slice(0, queryIndex)
  }

  return {
    path,
    query,
    hash
  }
}
// 将路径中//转化为/
export function cleanPath (path: string): string {
  return path.replace(/\/\//g, '/')
}
