const router = require("koa-router")()
const util = require("../utils/util")

const Dept = require("../models/deptSchema")

router.prefix("/dept")

/**
 * 部门列表查询
 */
router.get("/list", async (ctx) => {
  const { deptName } = ctx.request.query
  const params = {}
  if (deptName) params.deptName = deptName
  let rootList = (await Dept.find(params)) || []

  if (deptName) {
    ctx.body = util.success(rootList)
  } else {
    const permissionList = getTreeDept(rootList, null, [])
    ctx.body = util.success(permissionList)
  }
})

/**
 * 递归拼接树形列表
 */
function getTreeDept(rootList, id, list) {
  for (let i = 0; i < rootList.length; i++) {
    let item = rootList[i]
    if (String(item.parentId.slice().pop()) == String(id)) {
      list.push(item._doc)
    }
  }
  list.map((item) => {
    item.children = []
    getTreeDept(rootList, item._id, item.children)
    if (item.children.length == 0) {
      delete item.children
    } else if (item.children.length > 0 && item.children[0].menuType == 2) {
      // 快速区分按钮和菜单，用于后期做菜单按钮权限控制
      item.action = item.children
    }
  })
  return list
}

/**
 * 部门列表操作：创建/编辑/新增
 */
router.post("/operate", async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  let res, info
  try {
    if (action == "create") {
      res = await Dept.create(params)
      info = "创建成功"
    } else if (action == "edit") {
      params.updateTime = new Date()
      // console.log(_id);
      await Dept.findByIdAndUpdate(_id, params)
      info = "编辑成功"
    } else {
      await Dept.findByIdAndDelete(_id)
      await Dept.deleteMany({ parentId: { $all: [_id] } })
      info = "删除成功"
    }
    ctx.body = util.success({}, info)
  } catch (error) {
    ctx.body = util.fail({}, error.stack)
  }
})

module.exports = router
