/**
 * 封装了常用的工具函数和常量，便于在Koa应用中复用，提高开发效率
 */

// 引入依赖：日志模块、JWT(JSON Web Token)模块
const log4js = require("./log4j")
const jwt = require("jsonwebtoken")

// 定义常量：用于统一返回结果的格式
const CODE = {
  SUCCESS: 200,
  PARAM_ERROR: 10001, // 参数错误
  USER_ACCOUNT_ERROR: 20001, // 账号或者密码错误
  USER_LOGIN_ERROR: 30001, // 用户未登录
  BUSINESS_ERROR: 40001, // 业务请求失败
  AUTH_ERROR: 50001, // 认证失败或者token过期
}

// 导出模块
module.exports = {
  /**
   * 分页函数封装
   * @param {number} pageNum
   * @param {number} pageSize
   */
  pager({ pageNum = 1, pageSize = 10 }) {
    pageNum *= 1 // 隐式转换
    pageSize *= 1
    const skipIndex = (pageNum - 1) * pageSize
    return {
      page: {
        pageNum,
        pageSize,
      },
      skipIndex,
    }
  },

  // 成功响应
  success(data = "", msg = "", code = CODE.SUCCESS) {
    return {
      code,
      data,
      msg,
    }
  },

  // 失败响应
  fail(msg = "", code = CODE.BUSINESS_ERROR, data) {
    return {
      code,
      data,
      msg,
    }
  },

  // 状态码
  CODE,

  // 解析JWT
  decoded(authorization) {
    if (authorization) {
      let token = authorization.split(" ")[1]
      // 验证成功：返回解码后的 payload 对象，这个对象包含了 JWT 中编码的所有声明
      // 验证失败：抛出一个错误。例如，如果 token 已过期或者签名不正确，jwt.verify 将会抛出一个错误
      return jwt.verify(token, "jason")
    }
    return ""
  },

  // 树形结构
  getTree(rootList, id, list) {
    for (let i = 0; i < rootList.length; i++) {
      let item = rootList[i]
      if (String(item.parentId.slice().pop()) == String(id)) {
        list.push(item._doc)
      }
    }
    list.map((item) => {
      item.children = []
      this.getTree(rootList, item._id, item.children)
      if (item.children.length == 0) {
        delete item.children
      } else if (item.children.length > 0 && item.children[0].menuType == 2) {
        // 快速区分按钮和菜单，用于后期做菜单按钮权限控制
        item.action = item.children
      }
    })
    return list
  },

  // 日期格式化
  formateDate(date, rule) {
    let fmt = rule || "yyyy-MM-dd hh:mm:ss"
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, date.getFullYear())
    }
    const o = {
      // 'y+': date.getFullYear(),
      "M+": date.getMonth() + 1,
      "d+": date.getDate(),
      "h+": date.getHours(),
      "m+": date.getMinutes(),
      "s+": date.getSeconds(),
    }
    for (let k in o) {
      if (new RegExp(`(${k})`).test(fmt)) {
        const val = o[k] + ""
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length == 1 ? val : ("00" + val).substr(val.length),
        )
      }
    }
    return fmt
  },
}
