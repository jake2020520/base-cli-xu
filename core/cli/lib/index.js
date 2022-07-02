"use strict";

module.exports = core;
const path = require("path");
const semver = require("semver"); // 版本号对比
const colors = require("colors/safe"); // 颜色
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const commander = require("commander");
const log = require("@imooc-cli-dev-x1/log");
const exec = require("@imooc-cli-dev-x1/exec");
const pkg = require("../package.json");
const constant = require("./const");

const program = new commander.Command();

async function core() {
  try {
    prepare(); // 前期准备
    registerCommand();
  } catch (e) {
    log.error(e.message);
    if (program.debug) {
      console.log("core: ", e);
    }
  }
}

async function prepare() {
  // 打印package里面的版本号
  checkPkgVersion();

  // 超级管理员权限降级 root sudo
  checkRoot();
  // 检查用户的主目录 或是否存在
  checkUserHome();
  // 检查传入的参数， 设置打印日志级别
  // checkInputArgs();
  // log.verbose("debug", "test debug log");
  // 配置环境变量
  checkEnv();
  //  检查软件的更新
  await checkGlobalUpdate();
}

function registerCommand() {
  program
    // 在 Commander 7 以前，选项的值是作为属性存储在 command 对象上的。
    // 这种处理方式便于实现，但缺点在于，选项可能会与Command的已有属性相冲突。
    // 通过使用.storeOptionsAsProperties()，可以恢复到这种旧的处理方式，并可以不加改动的继续运行遗留代码。
    // Commander 7之后所有的属性都要通过 opts() 获取
    .storeOptionsAsProperties()
    // .name 和 .usage 用来修改帮助信息的首行提示。name 属性也可以从参数自动推导出来。
    .name(Object.keys(pkg.bin)[0])
    .version(pkg.version)
    .usage("<command> [option]")
    .option("-d, --debug", "开启调试模式", false)
    .option("-tp --targetPath <targetPath>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化")
    .action(exec);

  /**
   * @description 实现 debug 模式
   * 方法一： 调用 on 方法监听 --debug
   * 方法二： 调用 on 方法监听 option:debug
   */
  program.on("option:debug", () => {
    if (program.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
    log.verbose("log.verbose设置测试");
  });
  /**
   * @description 设置全局变量
   * 本地调试文件的路径
   */
  program.on("option:targetPath", function () {
    process.env.CLI_TARGET_PATH = program.targetPath;
  });

  /**
   * @description 监听未知的命令
   */
  program.on("command:*", (obj) => {
    console.error("未知的命令：", obj[0]);
    // 获取所有已注册的命令
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log("可用命令：", availableCommands.join(", "));
  });
  // 没有 命令 或 找不到的命令  提醒帮助文档
  // if (program.args && program.args.length < 1) {
  if (process.argv.length < 3) {
    program.outputHelp();
    console.log();
  }

  program.parse(process.argv);
}

async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  // const currentVersion = pkg.version;
  // TODO: 便于本地调试
  const currentVersion = "1.1.1";
  const npmName = pkg.name;
  // 2. 调用npm API ，获取所有版本号
  const { getNpmSemverVersion } = require("@imooc-cli-dev-x1/get-npm-info");
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(`请手动更新${npmName},当前版本：${currentVersion},最新版本：${lastVersion}
      更新命令： npm install  -g ${npmName}`)
    );
  }
  // 3. 提取所有版本号，比对哪些版本号是大于当前版本号
  // 4. 获取最新的版本号，提示用户更新到该版本
}

function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  const curDotenvPath = path.resolve(__filename, "../../", ".env");
  // 拿到 .env里面配置的变量
  // console.log("dotenvPath: ", dotenvPath, curDotenvPath);
  let config;
  // 视频讲解的
  if (pathExists(dotenvPath)) {
    config = dotenv.config({
      path: dotenvPath,
    });
  }
  // 自己配置的
  if (pathExists(curDotenvPath)) {
    config = dotenv.config({
      path: curDotenvPath,
    });
  }
  createDefaultConfig();
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig["cliHome"];
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在"));
  }
}

function checkRoot() {
  // 管理员降级，不然有些需要加sudo 才能操作
  const rootCheck = require("root-check");
  rootCheck();
  // 超级管理员 是 0 ，降级后是501
}

function checkPkgVersion() {
  log.notice("cli version: ", pkg.version);
}

// function checkInputArgs() {
//   // 处理process 参数,把参数变成了对象
//   const minimist = require("minimist");
//   args = minimist(process.argv.slice(2));
//   // console.log("args: ", args);
//   checkArgs();
// }

// function checkArgs() {
//   // 设置日志的级别
//   if (args.debug) {
//     process.env.LOG_LEVEL = "verbose";
//   } else {
//     process.env.LOG_LEVEL = "info";
//   }
//   log.level = process.env.LOG_LEVEL;
// }
