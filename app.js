const Koa = require("koa") // 引入Koa框架
const app = new Koa() // 创建一个Koa实例
const onerror = require("koa-onerror") // 引入koa-onerror中间件，用于处理错误
const bodyparser = require("koa-bodyparser") // 引入koa-bodyparser中间件，用于解析请求体
const json = require("koa-json") // 引入koa-json中间件，用于格式化json响应
const views = require("koa-views") // 引入koa-views中间件，用于渲染模板
const router = require("koa-router")() // 引入koa-router并创建一个路由实例
const jwt = require("jsonwebtoken") // 引入jsonwebtoken库，用于生成和验证JWT
const koajwt = require("koa-jwt") // 引入koa-jwt中间件库，用于处理JWT的验证
const log4js = require("./utils/log4j") // 引入log4js，用于日志记录
const cors = require("@koa/cors")
const util = require("./utils/util")
const { verToken } = require("./utils/tokenVerify")

const user = require("./routes/user") // 引入路由
const menu = require("./routes/menu") // 引入路由

require("./config/db") // mongodb连接配置

/**
 * 中间件配置和使用
 */

// 错误处理中间件
onerror(app)

// 日志记录中间件
app.use(async (ctx, next) => {
  log4js.info(`get params:${JSON.stringify(ctx.request.query)} `)
  log4js.info(`post params:${JSON.stringify(ctx.request.body)} `)
  // await next().catch((err) => {
  //   console.log(err)
  //   if (err.status == "401") {
  //     ctx.status = 200
  //     ctx.body = util.fail("Token认证失败", util.CODE.AUTH_ERROR)
  //   } else {
  //     throw err
  //   }
  // })
  try {
    await next()
  } catch (err) {
    console.log("Error captured:", err)
    if (err.status === 401) {
      ctx.status = 200
      ctx.body = util.fail("Token认证失败", util.CODE.AUTH_ERROR)
    } else {
      throw err
    }
  }
})

// 解析请求体中间件
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  }),
)

// 格式化json响应中间件
app.use(json())

// 静态文件服务中间件，指向public目录
app.use(require("koa-static")(__dirname + "/public"))

// 视图渲染中间件，使用pug模板引擎
app.use(
  views(__dirname + "/views", {
    extension: "pug",
  }),
)

// 跨域中间件
app.use(
  cors({
    origin: "http://localhost:5173", // 或者使用 '*' 来允许所有域名
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  }),
)

// JWT身份验证中间件：使用中间件 + 配置密钥secret + 定义不需要进行JWT验证的路径
app.use(
  koajwt({ secret: "jason" }).unless({
    path: [/^\/api\/user\/login/],
  }),
)

// 路由配置
router.prefix("/api") // 设置全局路由前缀为 /api（这一行必须写最前面，后续定义的所有路由都会自动带上这个前缀）
router.use(user.routes(), user.allowedMethods()) // 使用用户路由中间件
router.use(menu.routes(), menu.allowedMethods()) // 使用菜单路由中间件
app.use(router.routes(), router.allowedMethods()) // 使用路由中间件（这一行必须在所有路由和中间件定义之后调用）

// 错误配置
app.on("error", (err, ctx) => {
  log4js.error(`${err.stack}`) // 处理全局错误并记录日志
})

// 导出Koa实例，供其他模板使用
module.exports = app
