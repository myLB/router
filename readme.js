/*normalizePath*/
/**
 * @param
 * path: 定义路由时的路径
 * parent: 父路由的配置信息
 * strict: 是否为严格模式
 * @return
 * 非严格模式下以'/'结尾的path删除'/'字符
 * 以'/'开头的path: 不做处理返回path
 * 不存在parent: 对path不做处理返回path
 * 不以'/'开头并存在parent: 返回parent.path/path
**/


/*compileRouteRegex*/
/**
 * @param
 * path: 完整的路径
 * pathToRegexpOptions: 将路径转为正则的一些参数: sensitive:true 区别大小写  strict: true 严格模式
 * @return
 * path的正则表达式
 **/


/*addRouteRecord*/
/**
 * @param
 * pathList: 路径(path)集合
 * pathMap: 以路径为key,路由信息为value的map集合
 * nameMap: 以路由名为key,路由信息为value的map集合
 * route: 定义路由时的单个路由配置信息
 * parent: 父路由配置信息
 * matchAs: 存在别名的路由信息的完整路径(存在别名的路由信息才有)
 * @aim
 * 将解析完的路由信息放入pathMap和nameMap中,将完整路径放入pathList中
**/
let addRouteRecord = {
    record: {
        path: '/parent/:bar',//完整路径
        /*  例子
            const keys = []
            const regexp = pathToRegexp('/foo/:bar', keys)
            regexp = /^\/foo\/([^\/]+?)\/?$/i
            keys = [{ name: 'bar', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }]
        */
        regex: /^\/parent\/([^\/]+?)\/?$/i,//路径的正则表达式
        components: {
            default: () => import('/parent.vue')
        },//路径对应想要加载的路径
        instances: {},//缓存RouterView显示的组件实例
        name: 'parent',//当前路由的名字
        parent: null,//父路由信息(存在的话)
        matchAs: '',//别名原本路由的路径
        redirect: '/index',//重定向
        beforeEnter: fn,//进入该路由之前的函数
        meta: {},//暂不明
        props: {} || {default: {}},//向路由组件传递信息
    },
    pathMap: {
        '/parent/:bar': addRouteRecord.record
    },//以路径为key,路由信息为value的map集合
    pathList: ['/parent/:bar'],//路径集合
    nameMap: {
        parent: addRouteRecord.record
    },//以路由名为key,路由信息为value的map集合(相同名的报错)
}

/*createRouteMap*/
/**
 * @param
 * routes: 整个路由配置信息
 * oldPathList: 原路径(path)集合 || [](初始化时)
 * oldPathMap: 原有的key为path的路由信息map集合 || [](初始化时)
 * oldNameMap: 原有的key为name的路由信息map集合 || [](初始化时)
 * @return
 * pathList: 路径(path)集合
 * pathMap: 以路径为key,路由信息为value的map集合
 * nameMap: 以路由名为key,路由信息为value的map集合
**/

/*createMatcher*/
/**
 * @param
 * routes: 定义路由时的路由信息集合
 * router: 路由实例
 * @return
 * match: fn
 * addRoutes: fn
 * @aim
 * 解析路由信息集合并返回相应的一些处理函数
**/


/*createRoute*/
/**
 * @param
 * record: 路由信息记录
 * location: 当前路径解析后的路由信息
 * redirectedFrom:
 * router：路由实例
 * @return
 * 一个新的路由信息(开发者可用获取到的route)
**/


/*getFullPath*/
/**
 * @param
 * { path, query = {}, hash = '' }: 路由信息
 * _stringifyQuery: 处理query的函数
 * @return
 * 完整的路径,包含路径 + query + hash
**/

/*formatMatch*/
/**
 * record: 路由信息记录
 * @return
 * 包含其自身以及其父路由信息记录的集合
**/


/*History*/
let History = {
    router: router,//路由实例
    base: '/app',//基路径(option.base)
    current: {
        name: '',//路由名
        meta: {},//暂不明
        path: '',//当前路由的路径
        hash: '',//当前路由路径的锚点
        query: {},//当前路由路径的query
        params: {},//当前路由路径的参数值(定义路径时/foo/:bar,当前路径/foo/4,params = {bar: 4})
        fullPath: '/app/foo/4?id=6',//当前页面的完整路径
        matched: [],//当前路由的祖先路由的信息集合(包含自身的record,顺序是祖先到自身)
        redirectedFrom: '',//暂不明
    },//当前路径的路由信息(初始值路径为'/')
    pending: null,//暂时保存将要跳转到的路由信息
    ready: false,//暂不明
    readyCbs: [],//暂不明
    readyErrorCbs: [],//暂不明
    errorCbs: [],//暂不明
    listen: fn,//暂不明
    onReady: fn,//暂不明
    onError: fn,//暂不明
    transitionTo: fn,//暂不明
    confirmTransition: fn,//暂不明
    updateRoute: fn,//暂不明
}

/*window.history.replaceState*/
/**
 * @param
 * stateObj: {key: 'app'}   修改history.state
 * title: null              页面标题
 * url: '/page.html'        同一域名下新的路径
 * @aim
 * 修改当前页面的路径以及浏览记录中的路径但不刷新页面
**/

/*window.history.pushState*/
/**
 * @param
 * stateObj: {key: 'app1'}   修改history.state
 * title: null               页面标题
 * url: '/page1.html'        同一域名下新的路径
 * @aim
 * 在浏览记录中新增该路径记录也不进行跳转
**/

/*window.popstate*/
/**
 * @param
 * event: window.history对象
 * @aim
 * 监听浏览器后退、前进的操作
**/


/*HTML5History*/
let HTML5History = Object.assign({
    go: fn,//跳转浏览记录
    push: fn,//暂不明
    replace: fn,//暂不明
    ensureURL: fn,//暂不明
    getCurrentLocation: fn,//暂不明
}, History)

/*parsePath*/
/**
 * @param
 * path: 路径
 * @return
 * path: 去除query和hash后的路径
 * query: location.search
 * hash: location.hash
**/

/*normalizeLocation*/
/**
 * @param
 * raw: 当前页面路径 || 解析过的页面路径信息
 * current: 当前路由信息
 * append: 是否删除路径最后的/后面的字符
 * router: 路由实例
 * @return
 * _normalized: 表示已经解析过该路径信息
 * path: 去除query和hash的路径
 * query: 对象形式的query
 * hash: hash值  比如: '#app'
**/

/*resolveQuery*/
/**
 * @param
 * query: 字符串形式的query类似location.search
 * extraQuery: 暂不明
 * _parseQuery: 用户自定义的解析query函数
 * @return
 * parsedQuery: 对象形式的query对象(相同key名的合并而不是替换)
**/

/*parseQuery*/
/**
 * @param
 * query: 字符串形式的query类似location.search
 * @return
 * res: 对象形式的query对象(相同key名的合并而不是替换)
**/

/*matchRoute*/
/**
 * @param
 * regex: 定义路由时解析出来的路由正则表达式,用于匹配路径的
 * path: 用来被regex匹配的路径
 * params: 路径解析出来的或自定义的params
 * @return
 * false: 路径不匹配
 * true:  路径匹配
 *      1、不存在params
 *      2、存在params,将路径中的params以key-value的形式保存在normalizeLocation函数返回的对象中
 * @aim
 * 判断路径是否与定义路由时的路径相匹配,并且存在params时将其解析以key-value的形式保存
**/



/*_createRoute*/
/**
 * @param
 * record: 定义路由解析后的信息(路由记录)
 * location: 当前页面的路径信息
 * redirectedFrom: 暂不明
 * @return
 *    @condition
 *      路由记录存在重定向属性       redirect()
 *      别名的路由记录包括其子路由    alias()
 *      正常路由                    createRoute()
**/


/*match*/
/**
 * @param
 * raw: 当前页面的路径
 * currentRoute: 当前路由信息
 * redirectedFrom: 暂不明
 * @return
 * 一个新的路由信息($route)
**/

/*confirmTransition*/
/**
 * @param
 * route: 要跳转到的路由信息
 * onComplete: 暂不明
 * onAbort: 处理错误的函数
 * @aim
 *
**/

/*isSameRoute*/
/**
 * @param
 * a: 将要跳转到的路由信息
 * b: 当前的路由信息(可空)
 * @return
 *      @condition
 *        当前路由信息为初始值路由信息      a === b
 *        没有传递b                       false
 *        a和b都存在path属性               判断2者的路径、hash、query是否完全相同
 *        a和b都存在name属性(路由名)       判断2者的name、hash、query、params是否完全相同
 *        不符合以上任何一种               false
 * @aim
 * 判断当前路由和将要跳转的路由是否为同一个页面
**/


/*html5: ensureURL*/
/**
 * @param
 * push: 判断条件   false: 修改浏览记录   true: 新增浏览记录
 * @aim
 * 当路径变化时，通过判断条件来确定是修改浏览记录还是新增浏览记录
**/

/*pushState*/
/**
 * @param
 * url: 新增或修改浏览记录的路径
 * replace: 新增还是修改的判断条件(true修改)
 * @aim
 * 缓存当前浏览记录的文档滚动位置;
 * 修改或新增浏览记录,并将当前页面路径改为url参数
**/

/*resolveQueue*/
/**
 * @param
 * current: 当前路由信息的祖先路由信息记录(包括自身)
 * next: 将要跳转路由的祖先路由信息记录(包括自身)
 * @return
 * updated: 需要更新的路由信息记录
 * activated: 当前激活的路由信息记录
 * deactivated: 无效的路由信息记录
 * @aim
 * 根据两者的对比来确定哪些路由已无效、需要更新、需要激活
**/

/*extractLeaveGuards*/
/**
 * @param
 * deactivated: 无效的路由信息记录
 * @return
 * arr: 所有无效路由信息记录中的组件的beforeRouteLeave生命周期函数集合
**/

/*extractGuards*/
/**
 * @param
 * records: 路由信息记录
 * name: 路由生命周期函数名
 * bind: 对生命周期函数进行重新封装的函数
 * reverse: 反转数组顺序用的   布尔值
 * @return
 * arr: 封装过的生命周期函数 || undefined(取决于是否存在组件实例)的集合
**/

/*extractGuard*/
/**
 * @param
 * def: vue实例的options参数
 * key: 生命周期函数名
 * @return
 * arr: 生命周期函数集合
**/

/*flatten*/
/**
 * @param
 * arr: 需要结构的多维数组
 * @return
 * arr: 一维或多维数组(取决于参数维数是否大于二维,大于则多维)
 * @aim
 * 将二维数组变成一维数组
**/

/*flatMapComponents*/
/**
 * @param
 * matched: 路由信息记录集合
 * fn: 回调函数
 * @return
 * arr: fn对所有路由信息记录中的组件集合处理后的结果集合
**/

/*extractUpdateHooks*/
/**
 * @param
 * updated: 需要更新的路由信息记录
 * @return
 * arr: 所有需要更新的路由信息记录中的组件的beforeRouteUpdate生命周期函数集合
**/

/*resolveAsyncComponents*/
/**
 * @param
 * matched: 路由信息记录集合
 * @return
 * fn: 处理异步路由组件的函数
**/


/*extractEnterGuards*/
/**
 * @param
 * activated: 需要激活的路由信息记录
 * cbs: 回调函数收集器
 * isValid: 判断函数,判断   返回布尔值
 * @return
 * arr: 所有需要激活的路由信息记录中的组件的beforeRouteEnter生命周期函数集合
**/

/*updateRoute*/
/**
 * @param
 * route: 将要跳转的路由信息
 * @aim
 * 更新所有组件中的当前路由信息以及current为route,
 * 执行全局定义的afterEach函数参数
**/































