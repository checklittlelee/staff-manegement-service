const router = require("koa-router")()
const util = require("../utils/util")

const Menu = require("../models/menuSchema") // 引入菜单模型

router.prefix("/menu") // 设置路由前缀为/menu

/**
 * 获取菜单列表
 */
router.get("/list", async (ctx) => {
  // 获取查询参数
  const { menuName, menuState } = ctx.request.query
  // 构建查询条件
  const params = {}
  if (menuName) params.menuName = menuName
  if (menuState) params.menuState = menuState
  // 从数据库中查找符合条件的菜单项
  let rootList = (await Menu.find(params)) || []
  // 转化为树形结构
  const menuList = getTreeMenu(rootList, null, [], params.menuName)
  ctx.body = util.success(menuList)
})
// 递归拼接树形列表
function getTreeMenu(rootList, id, list, menuName = null) {
  // 遍历跟列表
  for (let i = 0; i < rootList.length; i++) {
    let item = rootList[i]
    if (String(item.parentId.slice().pop()) == String(id) || menuName) {
      list.push(item._doc)
    }
  }
  // 处理子节点
  list.map((item) => {
    item.children = []
    getTreeMenu(rootList, item._id, item.children)
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
 * 菜单列表操作：创建/编辑/新增
 */
router.post("/operate", async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  let res, info

  try {
    if (action == "add") {
      res = await Menu.create(params)
      info = "创建成功"
    } else if (action == "edit") {
      params.updateTime = new Date()
      await Menu.findByIdAndUpdate(_id, params)
      info = "编辑成功"
    } else {
      await Menu.findByIdAndDelete(_id)
      await Menu.deleteMany({ parentId: { $all: [_id] } })
      info = "删除成功"
    }
    ctx.body = util.success({}, info)
  } catch (error) {
    ctx.body = util.fail({}, error.stack)
  }
})

module.exports = router
