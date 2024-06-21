/**
 * 文件导入部分
 */
const router = require("koa-router")() // 引入koa-router并创建一个路由实例
const util = require("../utils/util") // 引入工具模块
const jwt = require("jsonwebtoken") // 引入jsonwebtoken模块，用于生成JWT令牌
const md5 = require("md5") // 引入md5模块，用于加密密码

const User = require("../models/userSchema") // 引入用户模型
const Menu = require("../models/menuSchema") // 引入菜单模型
const Role = require("../models/roleSchema") // 引入角色模型
const Counter = require("../models/counterSchema") // 引入消息计数模块

/**
 * 路由前缀：设置路由前缀为/user，意味着所有以/user开头的请求都会到user.js中定义的路由处理函数中处理
 */
router.prefix("/user")

/**
 * 登录：POST请求更安全，如果用GET，数据会在URL的查询字符串中传递；且POST请求可以传递大量数据
 */
router.post("/login", async (ctx) => {
  try {
    // 获取用户名和密码
    let { userName, userPwd } = ctx.request.body

    // 使用MD5加密的密码在数据库中查找用户：MD5哈希算法加密
    // findOne：第一个参数是查询条件，去查找用户名和密码匹配的用户；第二个参数是一个投影(projection)，指定查询结果要返回的字段
    // 如果在数据库中匹配到这个用户，那么res将是一个包含第二个参数中字段的文档对象
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
      // res这个文档对象，不仅包含了我们要的字段数据，还包含了一些Mongoose添加的元数据和方法，用于操作和管理文档，例如 _id, _v, save(), remove(), update() 等方法和内部属性
      // 使用_doc属性可以获得纯粹的文档数据
      const data = res._doc
      // 生成JWT：jwt.sign方法接受三个参数：负载(包含用户数据)、秘钥secretKey(用于加密令牌) 和 选项(如过期时间)
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
      // 2. 未找到用户记录：返回失败信息。ctx.body被设计为默认指向ctx.response.body
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
  const { userId, userName, state } = ctx.request.query
  const { page, skipIndex } = util.pager(ctx.request.query)
  // 构建查询条件：在前端中可以通过userId、userName、state去查询
  let params = {}
  if (userId) params.userId = userId
  if (userName) params.userName = userName
  if (state && state != "0") params.state = state
  // 执行数据库查询
  try {
    // 查询用户列表，并排除_id和userPwd字段
    // find：第一个参数是查询条件params；第二个参数是投影(projection)，这是一个对象，指定了查询结果中包含或排除的字段。0表示排除，1表示包含
    // 在前端，存在两种情况：一种是带有查询参数进行特定查询，另一种是没有查询参数获取所有用户列表。如果是第二种，params为空对象，那么Mongoose的find方法会返回集合中的所有文档，这是find的默认行为
    // _id是MongoDB自动生成的唯一标识符，用于唯一标识每个文档，对客户端没有意义；不返回userPwd，原因是没意义且存在安全风险
    const query = User.find(params, { _id: 0, userPwd: 0 })
    // 后端分页处理
    // skip：跳过指定数量的文档，用于分页的偏移；limit：限制返回的文档数量，控制每页的条目数。都是Mongoose提供的分页方法
    const list = await query.skip(skipIndex).limit(page.pageSize)
    // countDocuments：获取总条目数
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
  // 获取要删除的用户ID列表
  const { userIds } = ctx.request.body
  // 将对应用户的状态更新为“离职”（状态2）
  const res = await User.updateMany({ userId: { $in: userIds } }, { state: 2 })
  // 返回删除结果
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
    // 添加操作的逻辑
    if (!userName || !userEmail || !deptId) {
      ctx.body = util.fail("参数错误", util.CODE.PARAM_ERROR)
      return
    }

    // 检查用户名和邮箱是否重复，若不重复则创建新用户
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
    // 编辑操作的逻辑
    if (!deptId) {
      ctx.body = util.fail("部门不能为空", util.CODE.PARAM_ERROR)
      return
    }
    // 更新用户信息
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

/**
 * 获取所有用户列表，不带分页和查询条件：前端部门管理，设置负责人时会调用
 */
router.get("/all/list", async (ctx) => {
  try {
    const list = await User.find({}, "userId userName userEmail")
    ctx.body = util.success(list)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

/**
 * 获取权限列表：解析JWT令牌获取用户角色信息；根据用户角色获取对应的菜单列表和操作列表；返回菜单列表和操作列表
 */
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

/**
 * 导出路由
 */
module.exports = router
