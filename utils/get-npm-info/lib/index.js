"use strict";

const axios = require("axios");
const urlJoin = require("url-join"); //url 拼接
const semver = require("semver"); // 版本比对
// 得到所有项目信息
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry(true);
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios
    .get(npmInfoUrl)
    .then((response) => {
      if (response.status === 200) {
        return response.data;
      }
      return null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}
// 项目url
function getDefaultRegistry(isOriginal = true) {
  return isOriginal
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org";
}
//得到项目的所有版本号
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}
// 过滤得到满足条件的版本
function getSemverVersions(baseVersion, versions = []) {
  // sort 可以傳入函數參數 compareFunction(a,b)
  // 分別表示兩個元素值怎麼做比較，然後傳回一個數字，可能是正數、0 或負數
  const newVersions = versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => {
      return semver.gt(a, b) ? -1 : 1;
    });
  return newVersions;
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  // console.log("versions: ", versions);
  // TODO: 便于本地调试
  //   const newVersions = getSemverVersions(baseVersion, versions);
  const newVersions = getSemverVersions(baseVersion, [
    "1.0.5",
    "1.1.1",
    "1.1.0",
    "1.0.4",
    "1.0.2",
    "1.0.1",
  ]);
  // console.log("newVersions", baseVersion, newVersions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return newVersions;
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  if (versions) {
    versions = versions.sort((a, b) => (semver.gt(a, b) ? -1 : 1));
    return versions[0];
  }
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
