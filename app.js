const Koa = require("koa")
const app = new Koa()
const views = require("koa-views")
const json = require("koa-json")
const onerror = require("koa-onerror")
const bodyparser = require("koa-bodyparser")
const log4js = require("./utils/log4j")

const index = require("./routes/index")
const users = require("./routes/users")

// error handler
onerror(app)

// middlewares
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  }),
)
app.use(json())
app.use(require("koa-static")(__dirname + "/public"))
app.use(
  views(__dirname + "/views", {
    extension: "pug",
  }),
)

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  log4js.info("info output")
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())

// error-handling
app.on("error", (err, ctx) => {
  log4js.error(`${err.stack}`)
})

module.exports = app
