// log4js 的日志工具模块：记录、管理日志

// 1. 导入和配置 log4js
const log4js = require("log4js")

const levels = {
  trace: log4js.levels.TRACE, //设置常量
  debug: log4js.levels.DEBUG,
  info: log4js.levels.INFO,
  warn: log4js.levels.WARN,
  error: log4js.levels.ERROR,
  fatal: log4js.levels.FATAL,
}

// 2. 配置 log4js
log4js.configure({
  // 定义日志的输出方式和位置。Appenders 是日志系统的输出端，可以理解为日志记录的目的地
  appenders: {
    // 目的地一：将日志输出到控制台
    console: { type: "console" },
    // 目的地二：将 info 级别的日志保存到文件 logs/all-logs.log 中
    info: {
      type: "file", //设置文件保存
      filename: "logs/all-logs.log", //设置info的文件路径
    },
    // 目的地三：将 error 级别的日志按日期保存到文件，文件名格式为 logs/log-yyyy-MM-dd.log
    error: {
      type: "dateFile",
      filename: "logs/log",
      pattern: "yyyy-MM-dd.log",
      alwaysIncludePattern: true, // 设置文件名称是 filename + pattern
    },
  },
  // 定义日志分类及其对应的输出方式和日志级别
  categories: {
    // default日志记录器
    default: { appenders: ["console"], level: "debug" },
    // info日志记录器
    info: {
      appenders: ["console", "info"],
      level: "info",
    },
    // error日志记录器
    error: {
      appenders: ["console", "error"],
      level: "error",
    },
  },
})

// 封装以下三个函数去执行如何记录日志信息
// 1. 获取相应级别的日志记录器；2. 设置日志记录器的日志级别；3. 记录传入的日志内容

/**
 * 日志输出 level为debug
 */
exports.debug = (content) => {
  let logger = log4js.getLogger("debug")
  logger.level = levels.debug
  logger.debug(content)
}

/**
 * 日志输出 level为info
 */
exports.info = (content) => {
  let logger = log4js.getLogger("info") //这里需要传入上面定义的配置
  logger.level = levels.info
  logger.info(content)
}

/**
 * 日志输出 level为error
 */
exports.error = (content) => {
  let logger = log4js.getLogger("error")
  logger.level = levels.error
  logger.error(content)
}
