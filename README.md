### 一、脚手架开发流程

- **开发流程**
  创建 npm 项目
  创建脚手架入口文件，最上方添加：#!/usr/bin/env node
  配置 package.json，添加 bin 属性
  编写脚手架代码
  将脚手架发布到 npm
  npm login npm 的用户名 jake2020520/xds123;,$@1
  npm publish 包里面 base-cli-xu
  线上：https://www.npmjs.com/settings/jake2020520/packages
- **使用流程**
  安装脚手架：npm i -g @base-cli-xu/core
  使用脚手架：base-cli-xu init

- **脚手架本地 link 标注流程**
  cd base-cli-xu/core/cli
  npm link ：会把本地的 bin 链接到 全局 bin
  既可以使用：base-cli-xu 全局命令了

- **lerna 操作流程**

  1. 在 https://www.npmjs.com/ 新建 add organization eg：imooc-cli-dev 或者 base-cli-xu,不用加 @
     和 lerna create core 时 package name 名字一样 eg: @imooc-cli-dev/core
  2. git add . git commit -m "--" git push
  3. lerna publish
     中间有报错时，根据提示 ，新建 LICENSE.md
     在每个包的 package.json 加上
     "publishConfig": {
     "access": "public"
     }
