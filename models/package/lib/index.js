"use strict";
const npminstall = require("npminstall"); //npminstall 安装
const path = require("path");
const fse = require("fs-extra");
const pathExists = require("path-exists").sync;

const pkgDir = require("pkg-dir").sync; // 找到 项目里面的package.json
const { isObject } = require("@imooc-cli-dev-x1/utils");
const formatPath = require("@imooc-cli-dev-x1/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@imooc-cli-dev-x1/get-npm-info");
class Package {
  constructor(options) {
    if (!options) {
      throw new Error("package类的options 参数不能为空");
    }
    // console.log("package constructor", options);
    if (!isObject(options)) {
      throw new Error("package类的options 必须为对象");
    }
    // package的目标路径
    this.targetPath = options.targetPath;
    // package的缓存路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
    // package 的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      // 如果目录不存在，就创建这个目录
      fse.mkdirpSync(this.storeDir);
    }
    // getNpmLatestVersion 获取版本号
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  /**
   * @description @imooc-cli/init ---》 拼接 _@imooc-cli_init@1.1.3@@imooc-cli
   */
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }
  /**
   * @description 特定版本
   */
  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  /**
   * @description 判断当前package是否存在
   */
  async exists() {
    // 缓存模式
    if (this.storeDir) {
      // 获取版本号
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }
  /**
   * @description 按照package
   */
  install() {
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }
  /**
   * @description 更新package
   */
  async update() {
    await this.prepare();
    // 1、获取最新的版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2、查询最新的版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3、如果不存在，直接按照最新的

    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{ name: this.packageName, version: latestPackageVersion }],
      });
      this.packageVersion = latestPackageVersion;
    } else {
      this.packageVersion = latestPackageVersion;
    }
    return latestFilePath;
  }
  /**
   * @description 获取入口文件的路径
   */
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1、获取package.json所在目录
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2、读取 package.json
        const pkgFile = require(path.resolve(dir, "package.json"));
        // 3、寻找main/lib
        if (pkgFile && pkgFile.main) {
          // 4、路径的兼容(macOs/windows)
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
