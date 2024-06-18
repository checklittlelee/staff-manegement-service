// 引入jsonwebtoken库，该库提供了用于生成和验证JWT的功能
const jwt = require("jsonwebtoken")

// 导出verToken函数，该函数接收一个参数token，即需要验证的JWT
exports.verToken = function (token) {
  return new Promise((resolve, reject) => {
    // 如果验证成功，userInfo将包含解码后的token信息
    var userInfo = jwt.verify(token, "jason")
    resolve(userInfo)
  }).catch((error) => {
    reject(error)
  })
}
