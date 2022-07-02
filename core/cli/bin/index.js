#! /usr/bin/env node
const utils = require("@base-cli-xu/utils");
// 优先使用本地的按照的 base-cli-xu
const importLocal = require("import-local");
if (importLocal(__filename)) {
  require("npmlog").info("cli", "正在使用base-cli-xu imooc-cli 本地版本");
} else {
  require("../lib")(process.argv.slice(2));
}
