"use strict";
const semver = require("semver"); // 版本号对比
const colors = require("colors/safe");
const log = require("@imooc-cli-dev-x1/log"); // 颜色
const { isObject } = require("@imooc-cli-dev-x1/utils"); // 颜色
const LOWEST_NODE_VERSION = "12.0.0";
class Command {
  constructor(argv) {
    // console.log("command constructor", argv);
    this._argv = argv;
    if (!argv) {
      throw new Error("参数不能为空");
    }
    if (!Array.isArray(argv)) {
      throw new Error("参数必须为数组");
    }
    if (argv.length < 1) {
      throw new Error("参数列表不能为空");
    }
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      // 错误进行监听
      // 每新建 promise,都要重新 监听catch,才能监听错误
      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
    // console.log("initArgs---: ", this._cmd);
    // console.log("initArgs-11--: ", this._argv);
  }

  /**
   * @description 比对node 版本
   */
  checkNodeVersion() {
    // 第一步 获取当前node 版本
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    // 第二步，对比最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`imooc-cli 需要按照V${lowestVersion}以上版本 Node`)
      );
    }
  }
  init() {
    throw new Error("init 必须实现");
  }
  exec() {
    throw new Error("exec 必须实现");
  }
}

function command() {
  // TODO
}
module.exports = Command;
