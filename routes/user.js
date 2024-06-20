const router = require("koa-router")() // 引入koa-router并创建一个路由实例
const util = require("../utils/util") // 引入工具模块
const jwt = require("jsonwebtoken") // 引入jsonwebtoken模块，用于生成JWT令牌
const md5 = require("md5") // 引入md5模块，用于加密密码

const User = require("../models/userSchema") // 引入用户模型
const Menu = require("../models/menuSchema") // 引入菜单模型
const Role = require("../models/roleSchema") // 引入角色模型
const Counter = require("../models/counterSchema") // 引入消息模块

router.prefix("/user") // 设置路由前缀为/user

/**
 * 登录
 */
router.post("/login", async (ctx) => {
  try {
    // 获取用户名和密码
    let { userName, userPwd } = ctx.request.body

    // 使用MD5加密的密码在数据库中查找用户：MD5哈希算法加密。findOne第二个参数指定查询结果要返回的字段
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

/**
 * 获取用户列表
 */
router.get("/list", async (ctx) => {
  // 获取查询参数
  // console.log("ctx.request.query", ctx.request.query)
  const { userId, userName, state } = ctx.request.query
  const { page, skipIndex } = util.pager(ctx.request.query)
  // 构建查询条件
  let params = {}
  if (userId) params.userId = userId
  if (userName) params.userName = userName
  if (state && state != "0") params.state = state
  // 执行数据库查询
  try {
    const query = User.find(params, { _id: 0, userPwd: 0 })
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await User.countDocuments(params)
    ctx.body = util.success({
      page: {
        ...page,
        total,
      },
      list,
    })
  } catch (error) {
    ctx.body = util.fail(`查询异常${error.stack}`)
  }
})

/**
 * 删除用户
 */
router.post("/delete", async (ctx) => {
  const { userIds } = ctx.request.body
  // User.updateMany({ $or: [{ userId: 10001 }, { userId: 10002 }] })
  const res = await User.updateMany({ userId: { $in: userIds } }, { state: 2 })
  if (res.modifiedCount) {
    ctx.body = util.success(res, `共删除成功${res.modifiedCount}条`)
    return
  }
  ctx.body = util.fail("删除失败")
})

/**
 * 编辑用户
 */
router.post("/operate", async (ctx) => {
  const {
    userId,
    userName,
    userEmail,
    mobile,
    job,
    state,
    roleList,
    deptId,
    action,
  } = ctx.request.body

  if (action == "add") {
    if (!userName || !userEmail || !deptId) {
      ctx.body = util.fail("参数错误", util.CODE.PARAM_ERROR)
      return
    }
    // 自增长

    // 用户名和邮箱不能重复

    const res = await User.findOne(
      { $or: [{ userName }, { userEmail }] },
      "_id userName userEmail",
    )
    if (res) {
      ctx.body = util.fail(
        `监测到有重复的用户 , 信息如下：${res.userName} - ${res.userEmail}`,
      )
    } else {
      try {
        const doc = await Counter.findOneAndUpdate(
          { _id: "userId" },
          { $inc: { sequence_value: 1 } },
        )
        const user = new User({
          userId: doc.sequence_value,
          userName,
          userPwd: md5("123456"),
          userEmail,
          role: 1,
          roleList,
          state,
          job,
          deptId,
          mobile,
        })
        user.save()
        ctx.body = util.success({}, "用户创建成功")
      } catch (error) {
        ctx.body = util.fail(error.stack, "用户创建失败")
      }
    }
  } else {
    if (!deptId) {
      ctx.body = util.fail("部门不能为空", util.CODE.PARAM_ERROR)
      return
    }
    try {
      const res = await User.findOneAndUpdate(
        { userId },
        { mobile, job, state, roleList, deptId },
      )
      ctx.body = util.success(res, "更新成功")
      return
    } catch (error) {
      ctx.body = util.fail("更新失败")
    }
  }
})

router.get("/all/list", async (ctx) => {
  try {
    const list = await User.find({}, "userId userName userEmail")
    ctx.body = util.success(list)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

router.get("/getPremissionList", async (ctx) => {
  let authorization = ctx.request.headers.authorization
  let { data } = util.decoded(authorization)
  let menuList = await getMenuList(data.role, data.roleList)
  let actionList = getActionList(JSON.parse(JSON.stringify(menuList)))
  ctx.body = util.success({ menuList, actionList })
})

async function getMenuList(userRole, roleKeys) {
  let rootList = []
  if (userRole == 0) {
    rootList = (await Menu.find({})) || []
  } else {
    let roleList = await Role.find({ _id: { $in: roleKeys } })
    let permissionList = []
    roleList.map((role) => {
      let { checkedKeys, halfCheckedKeys } = role.permissionList
      permissionList = permissionList.concat(...checkedKeys, ...halfCheckedKeys)
    })
    permissionList = [...new Set(permissionList)]
    rootList = await Menu.find({ _id: { $in: permissionList } })
  }
  return util.getTree(rootList, null, [])
}

function getActionList(list) {
  const actionList = []
  const deep = (arr) => {
    while (arr.length) {
      let item = arr.pop()
      if (item.action) {
        item.action.map((action) => {
          actionList.push(action.menuCode)
        })
      }
      if (item.children && !item.action) {
        deep(item.children)
      }
    }
  }
  deep(list)

  return actionList
}
module.exports = router
