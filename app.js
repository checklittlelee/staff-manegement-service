const Koa = require("koa") // 引入Koa框架
const app = new Koa() // 创建一个Koa实例
const onerror = require("koa-onerror") // 引入koa-onerror中间件，用于处理错误
const bodyparser = require("koa-bodyparser") // 引入koa-bodyparser中间件，用于解析请求体
const json = require("koa-json") // 引入koa-json中间件，用于格式化json响应
const views = require("koa-views") // 引入koa-views中间件，用于渲染模板
const router = require("koa-router")() // 引入koa-router并创建一个路由实例
const log4js = require("./utils/log4j") // 引入log4js，用于日志记录

const users = require("./routes/users") // 引入路由

require("./config/db") // mongodb连接配置

/**
 * 中间件配置和使用
 */

// 1. 错误处理中间件
onerror(app)
// 2. 解析请求体中间件
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  }),
)
// 3. 格式化json响应中间件
app.use(json())
// 4. 静态文件服务中间件，指向public目录
app.use(require("koa-static")(__dirname + "/public"))
// 5. 视图渲染中间件，使用pug模板引擎
app.use(
  views(__dirname + "/views", {
    extension: "pug",
  }),
)

/**
 * 日志记录
 */

app.use(async (ctx, next) => {
  log4js.info(`get params:${JSON.stringify(ctx.request.query)} `)
  log4js.info(`post params:${JSON.stringify(ctx.request.body)} `)
  await next()
})

/**
 * 路由配置
 */

router.prefix("/api") // 设置全局路由前缀为 /api（这一行必须写最前面，后续定义的所有路由都会自动带上这个前缀）
router.use(users.routes(), users.allowedMethods()) // 使用用户路由中间件
app.use(router.routes(), router.allowedMethods()) // 使用路由中间件（这一行必须在所有路由和中间件定义之后调用）

/**
 * 错误配置
 */

app.on("error", (err, ctx) => {
  log4js.error(`${err.stack}`) // 处理全局错误并记录日志
})

/**
 * 导出Koa实例，供其他模板使用
 */

module.exports = app
