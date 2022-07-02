"use strict";

const log = require("npmlog");
// 修改前缀
log.heading = "imooc ";
// log的级别，低于info 就不打印
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

log.addLevel("success", 2000, { fg: "green", bold: true });

module.exports = log;
