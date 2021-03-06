"use strict";
const path = require("path");
const log = require("@base-cli-xu/log");
const { exec: spawn } = require("@base-cli-xu/utils");
const Package = require("@base-cli-xu/package");

const SETTINGS = {
  init: "@base-cli-xu/init",
};

const CACHE_DIR = "dependencies/";

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "",
    pkg;

  // TODO
  const cmdObj = arguments[arguments.length - 1];
  const cdmName = cmdObj.name(); //cmdObj._name 也可以取到
  const packageName = SETTINGS[cdmName];
  const packageVersion = "latest"; // 用此，逻辑
  // const packageVersion = "1.1.0";用此，逻辑才是完整

  // 目标路径不存在，生成缓存路径
  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath:no ", homePath, CACHE_DIR, targetPath);
    log.verbose("storeDir: ", storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if ((await pkg.exists()) && packageVersion != "latest") {
      // 更新
      await pkg.update();
    } else {
      // 安装
      await pkg.install();
    }
  } else {
    log.verbose("targetPath: ", targetPath);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
  }

  const rootFile = pkg.getRootFilePath();
  log.verbose("rootFile: ", rootFile);
  if (rootFile) {
    // console.log("---arguments--", arguments);
    // 异步的，重新catch
    // 每新建 promise,都要重新 监听catch,才能监听错误
    try {
      // require(rootFile)(Array.from(arguments));
      // 多进程
      const args = Array.from(arguments).slice(0, arguments.length - 1);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      // /Users/king/.base-cli-xu/dependencies/node_modules/_@base-cli-xu_init@0.1.3@@base-cli-xu/init/lib/index.js
      const code = `require('${rootFile}')(${JSON.stringify(args)})`;
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
