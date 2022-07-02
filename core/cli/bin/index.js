#! /usr/bin/env node
const utils = require("@imooc-cli-dev-x1/utils");
// 优先使用本地的按照的 imooc-cli-dev-xu
const importLocal = require("import-local");
if (importLocal(__filename)) {
  require("npmlog").info("cli", "正在使用imooc-cli-dev-xu imooc-cli 本地版本");
} else {
  require("../lib")(process.argv.slice(2));
}
