const request = require("@imooc-cli-dev-x1/request");

module.exports = function () {
  return request({
    url: "/project/template",
  });
};
