const request = require("@base-cli-xu/request");

module.exports = function () {
  return request({
    url: "/project/template",
  });
};
