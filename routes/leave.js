const router = require("koa-router")()
const util = require("../utils/util")
const jwt = require("jsonwebtoken")
const md5 = require("md5")

const Leave = require("../models/leaveSchema")
const Dept = require("../models/deptSchema")

router.prefix("/leave")

/**
 * 列表查询
 */
router.get("/list", async (ctx) => {
  const { applyState, type } = ctx.request.query
  let authorization = ctx.request.headers.authorization
  const { page, skipIndex } = util.pager(ctx.request.query)
  let { data } = util.decoded(authorization)
  try {
    let params = {}
    // 如果type是approve 说明当前是审核人
    // 对于fe来说 待审批 1 fe审批通过 审批中了 下一个审批人是 baidu  对于baidu 登录进去 待审批的状态
    if (type == "approve") {
      if (applyState == 1 || applyState == 2) {
        params.curAuditUserName = data.userName
        params.$or = [{ applyState: 1 }, { applyState: 2 }]
      } else if (applyState > 2) {
        params = { "auditFlows.userId": data.userId, applyState }
      } else {
        params = { "auditFlows.userId": data.userId }
      }
    } else {
      params = {
        "applyUser.userId": data.userId,
      }
      if (applyState) params.applyState = applyState
    }
    const query = Leave.find(params)
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await Leave.countDocuments(params)
    ctx.body = util.success({
      page: {
        ...page,
        total,
      },
      list,
    })
  } catch (error) {
    ctx.body = util.fail(`查询失败${error.stack}`)
  }
})

/**
 *
 */
router.get("/count", async (ctx) => {
  const token = ctx.request.headers.authorization.split(" ")[1]
  const payload = jwt.verify(token, "jason")
  const total = await Leave.find({
    auditFlows: { $elemMatch: { userId: payload.data.userId } },
    curAuditUserName: payload.data.userName,
    applyState: { $in: [1, 2] },
  })
  ctx.body = util.success(total.length)
})

/**
 *
 */
router.post("/operate", async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  let authorization = ctx.request.headers.authorization
  let { data } = util.decoded(authorization)
  if (action == "create") {
    let orderNo = "XJ"
    orderNo += util.formateDate(new Date(), "yyyyMMdd")

    const total = await Leave.countDocuments()
    params.orderNo = orderNo + total
    // 获取用户当前部门id
    let id = data.deptId.pop()
    // 查找负责人信息
    let dept = await Dept.findById(id)

    // 输出dept的内容以便调试
    console.log("Dept:", dept)

    // 获取人事部门 和 财务部门负责人信息
    let userList = await Dept.find({
      deptName: { $in: ["人事部门", "财务部门"] },
    })
    console.log(userList)
    let auditUsers = dept.userName
    let curAuditUserName = dept.userName
    let auditFlows = [
      {
        userId: dept.userId,
        userName: dept.userName,
        userEmail: dept.userEmail,
      },
    ]
    userList.map((item) => {
      auditFlows.push({
        userId: item.userId,
        userName: item.userName,
        userEmail: item.userEmail,
      })
      auditUsers += "," + item.userName
    })
    params.auditUsers = auditUsers
    params.curAuditUserName = curAuditUserName
    params.auditFlows = auditFlows
    params.auditLogs = []
    params.applyUser = {
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
    }

    let res = await Leave.create(params)
    ctx.body = util.success("", "创建成功")
  } else {
    let res = await Leave.findByIdAndUpdate(_id, { applyState: 5 })
    if (res) {
      ctx.body = util.success("", "操作成功")
    } else {
      ctx.body = util.success("", "操作失败")
    }
  }
})

/**
 *
 */
router.post("/approve", async (ctx) => {
  const { action, remark, _id } = ctx.request.body
  let authorization = ctx.request.headers.authorization
  let { data } = util.decoded(authorization)

  let doc = await Leave.findById(_id)

  let auditLogs = doc.auditLogs || []

  let params = {}

  if (action == "refuse") {
    params.applyState = 3
  } else {
    if (doc.auditFlows.length === doc.auditLogs.length) {
      ctx.body = util.success("当前申请已经处理了")
      return
    } else if (doc.auditFlows.length == doc.auditLogs.length + 1) {
      params.applyState = 4
    } else if (doc.auditFlows.length > doc.auditLogs.length) {
      params.applyState = 2
      params.curAuditUserName =
        doc.auditFlows[doc.auditLogs.length + 1].userName
    }
  }

  auditLogs.push({
    userId: data.userId,
    userName: data.userName,
    createTime: new Date(),
    remark,
    action: action == "refuse" ? "审核拒绝" : "审核通过",
  })
  params.auditLogs = auditLogs

  await Leave.findByIdAndUpdate(_id, params)

  ctx.body = util.success("", "处理成功")
})

module.exports = router
