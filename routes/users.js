const router = require("koa-router")() // 引入koa-router并创建一个路由实例
const util = require("../utils/util") // 引入工具模块
const jwt = require("jsonwebtoken") // 引入jsonwebtoken模块，用于生成JWT令牌
const md5 = require("md5") // 引入md5模块，用于加密密码

const User = require("../models/userSchema") // 引入用户模型

router.prefix("/users") // 设置路由前缀为/users

/**
 * 定义处理登录请求的路由
 */
router.post("/login", async (ctx) => {
  try {
    // 获取用户名和密码
    let { userName, userPwd } = ctx.request.body

    // 使用MD5加密的密码在数据库中查找用户
    let res = await User.findOne(
      { userName, userPwd: md5(userPwd) },
      "userId userName userEmail state role deptId roleList",
    )

    // 实现用户登录功能，登陆成功后返回一个JWT以供后续身份验证使用
    if (res) {
      // 1. 能找到用户
      // 1.1 如果离职：返回失败信息
      if (res.state === 2) {
        ctx.body = util.fail("该员工已离职")
        return
      }
      // 1.2 如果正常：提取数据，生成JWT令牌，返回成功响应
      const data = res._doc
      const token = jwt.sign(
        {
          data,
        },
        "jason",
        { expiresIn: "1h" },
      )
      data.token = token
      ctx.body = util.success(data)
    } else {
      // 2. 未找到用户记录：返回失败信息
      ctx.body = util.fail("用户名或者密码不正确")
    }
  } catch (error) {
    ctx.body = util.fail(error.msg)
  }
})

module.exports = router
