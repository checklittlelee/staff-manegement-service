const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
  // 用户ID，自增长
  userId: Number,
  // 用户名称
  userName: String,
  // 用户密码，md5加密
  userPwd: String,
  // 用户邮箱
  userEmail: String,
  // 手机号
  mobile: String,
  // 性别 0:男 1:女
  sex: Number,
  // 部门
  deptId: [],
  // 岗位
  job: String,
  // 状态 1: 在职 2: 离职 3: 试用期
  state: {
    type: Number,
    default: 1,
  },
  // 用户角色 0：系统管理员  1： 普通用户
  role: {
    type: Number,
    default: 1,
  },
  // 系统角色
  roleList: [],
  // 创建时间
  createTime: {
    type: Date,
    default: Date.now(),
  },
  // 更新时间
  lastLoginTime: {
    type: Date,
    default: Date.now(),
  },
  // 备注
  remark: String,
})

module.exports = mongoose.model("user", userSchema, "user")
// 创建一个名为“user”的Mongoose模型，基于userSchema，第三个参数“user”指定MongoDB中集合的名字

/**
 * 定义数据结构：明确了每个用户文档应该包含哪些字段以及字段的类型。
 * 数据验证：确保插入到数据库中的数据符合预定义的结构。
 * 简化数据库操作：通过Mongoose模型，可以方便地进行CRUD（创建、读取、更新、删除）操作。
 */
