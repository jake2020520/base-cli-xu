"use strict";
const fs = require("fs");
const path = require("path");
const userHome = require("user-home");
const inquirer = require("inquirer");
const semver = require("semver"); // 版本号对比
const fse = require("fs-extra");
const log = require("@imooc-cli-dev-x1/log"); // 颜色
const { spinnerStart, sleep } = require("@imooc-cli-dev-x1/utils"); // 颜色
const Command = require("@imooc-cli-dev-x1/command");
const Package = require("@imooc-cli-dev-x1/package");
const { exec, execAsync } = require("@imooc-cli-dev-x1/utils");

const glob = require("glob");
const ejs = require("ejs");

const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_COMMAND = ["npm", "cnpm"];
const PROJECT_INFO = [
  {
    name: "vue2标注模板",
    npmName: "template-xu-vue2",
    version: "1.0.0",
    type: "normal",
    installCommand: "npm install",
    startCommand: "npm run serve",
    tag: ["project"],
    ignore: ["**/public/**"],
  },
  {
    name: "vue2后台管理模板",
    npmName: "template-admin-xu-vue2",
    version: "1.0.0",
    tag: ["project"],
    ignore: ["**/public/**"],
  },
  {
    name: "乐高组件库",
    npmName: "template-components-xu1",
    version: "1.0.0",
    type: "normal",
    installCommand: "npm install",
    startCommand: "npm run serve",
    tag: ["component"],
    ignore: ["**/public/**"],
  },
  {
    name: "vue2自定义模板",
    npmName: "template-custom-xu-vue2",
    version: "1.0.7",
    type: "custom",
    installCommand: "npm install",
    startCommand: "npm run serve",
    tag: ["project"],
    ignore: ["**/public/**"],
  },
];
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName: ", this.projectName);
    log.verbose("force: ", this.force);
  }
  async exec() {
    try {
      // 1.准备阶段
      const projectInfo = await this.prepare();
      log.verbose("projectInfo:选中的项目 ", projectInfo);
      if (projectInfo) {
        this.projectInfo = projectInfo;
        // 2.下载模板
        await this.downLoadTemplate();
        // 3.安装模板
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
    }
  }

  async installTemplate() {
    log.verbose("installTemplate: ", this.templateInfo);
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 安装标注模板
        this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 安装自定义模板
        this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板");
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  async execCommand(command, errMessage) {
    let ret;
    if (command) {
      const cmdArr = command.split(" ");
      const cmd = this.checkCommand(cmdArr[0]);
      if (!cmd) {
        throw new Error("命令不存在！命令：" + command);
      }
      const args = cmdArr.slice(1);
      // cmd:npm args:['install']
      ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      if (ret !== 0) {
        throw new Error(errMessage);
      }
    }
  }

  ejsRender(option) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        { cwd: dir, ignore: option.ignore, nodir: true },
        (err, files) => {
          if (err) {
            reject(err);
          }
          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, res) => {
                  // console.log("renderFile", err, res);
                  if (err) {
                    reject1(err);
                  } else {
                    fse.writeFileSync(filePath, res);
                    resolve1(res);
                  }
                });
              })
                .then(() => {
                  resolve();
                })
                .catch((err) => {
                  reject(err);
                });
            })
          );
        }
      );
    });
  }

  async installNormalTemplate() {
    log.verbose("安装标准模板");
    let spinner = spinnerStart("正在安装模板...");
    await sleep();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
      log.verbose("缓存路径 目的路径:", templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板下载成功");
      const {
        installCommand,
        startCommand,
        ignore: templateIgnore,
      } = this.templateInfo;
      const templateItemIgnore = templateIgnore
        ? templateIgnore
        : ["**/public/**"];
      const ignore = ["node_modules/**", ...templateItemIgnore];
      await this.ejsRender({ ignore });
      // 依赖安装
      await this.execCommand(installCommand, "依赖安装异常");
      // 启动命令执行
      await this.execCommand(startCommand, "命令启动失败");
    }
  }
  async installCustomTemplate() {
    console.log("安装自定义模板");
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      if (fs.existsSync(rootFile)) {
        log.notice("开始执行自定义模板");
        const templatePath = path.resolve(
          this.templateNpm.cacheFilePath,
          "template"
        );
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose("code: ", code);
        await execAsync("node", ["-e", code], {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        log.success("自定义模板安装成功");
      } else {
        throw new Error("自定义模板入口文件不存在！");
      }
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async downLoadTemplate() {
    // 1.通过项目模板api获取项目模板信息
    // 2.通过egg.js搭建一套后端系统
    // 3. 通过npm存储项目模板
    // 4.将项目模板信息存储到mongodb数据库中
    // 5.通过egg.js获取mongodb中的数据并且通过api返回
    const { projectTemplate } = this.projectInfo;
    this.templateInfo = this.template.find(
      (template) => template.npmName === projectTemplate
    );
    const targetPath = path.resolve(userHome, ".imooc-cli-dev", "template");
    const storeDir = path.resolve(
      userHome,
      ".imooc-cli-dev",
      "template",
      "node_modules"
    );
    const { npmName, version } = this.templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载模板...");
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模板成功");
          this.templateNpm = templateNpm;
        }
      }
      // await templateNpm.install();
      // spinner.stop(true);
      // log.success("下载模板成功");
    } else {
      const spinner = spinnerStart("正在更新模板...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模板成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async prepare() {
    // 0. 判断模板是否存在 数据中获取
    let template;
    try {
      // 目前链接的是本地数据库，其他人连接不了
      template = await getProjectTemplate();
    } catch (error) {
      template = PROJECT_INFO;
    }
    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }
    this.template = template;
    // 1. 判断当前目录是否为空
    const localPath = process.cwd(); // 执行命名 所在路径
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (
          await inquirer.prompt([
            {
              type: "confirm",
              name: "ifContinue",
              default: false,
              message: "当前文件夹不为空，是否继续创建项目？",
            },
          ])
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      // 2.是否启动强制更新
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: `是否清除路径为${localPath}下的所有文件`,
        });
        if (confirmDelete) {
          // 清空文件夹的操作
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }
  async getProjectInfo() {
    function isValidName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    }
    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    // 1.选择创建项目和组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    log.verbose("type: ", type);
    this.template = this.template.filter((template) =>
      template.tag.includes(type)
    );
    const title = type === TYPE_PROJECT ? "项目" : "组件";
    let projectPrompt = [];
    // 2.获取项目的基本信息
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
      validate: function (v) {
        // 1.输入的首位字符
        // 2.尾字符必须为英文字符或者数字，不能为字符
        // 3. 字符仅允许“-_”
        const done = this.async();
        // Do async stuff
        setTimeout(function () {
          if (!isValidName(v)) {
            // Pass the return value in the done callback
            done(`请输入合法的${title}名称，例:a1_a1_a1`);
            return;
          }
          // Pass the return value in the done callback
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();

          // Do async stuff
          setTimeout(function () {
            if (!!!semver.valid(v)) {
              // Pass the return value in the done callback
              done("请输入合法的版本号,例如：1.1.0");
              return;
            }
            // Pass the return value in the done callback
            done(null, true);
          }, 0);
          return;
        },
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模板`,
        choices: this.createTemplateChoice(),
      }
    );
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = { ...projectInfo, type, ...project };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入组件描述信息",
        default: "",
        validate: function (v) {
          const done = this.async();
          // Do async stuff
          setTimeout(function () {
            if (!v) {
              // Pass the return value in the done callback
              done("请输入组件描述信息");
              return;
            }
            // Pass the return value in the done callback
            done(null, true);
          }, 0);
          return;
        },
      };
      projectPrompt.push(descriptionPrompt);
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = { ...projectInfo, type, ...component };
    }
    // 生成 classname
    if (projectInfo.projectName) {
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    return projectInfo;
    //
  }

  createTemplateChoice() {
    const data = this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
    return data;
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    );
    // console.log("isCwdEmpty:00 ", fileList);
    return !fileList || fileList.length <= 0;
  }
}
function init(argv) {
  // TODO
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
