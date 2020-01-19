/* @flow */
//递归执行生命周期函数
export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    //没有任何路由生命周期函数或者已执行完所有生命周期函数直接执行回调函数
    if (index >= queue.length) {
      cb()
    } else {
      // 存在则执行,不存在则执行下一个(集合中有可能会有undefined,组件中没有路由生命周期函数会收集undefined)
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
