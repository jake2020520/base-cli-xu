"use strict";

const axios = require("axios");

const BASE_URL = process.env.IMOOC_CLI_BASE_URL
  ? process.env.IMOOC_CLI_BASE_URL
  : "http://book.youbaobao.xyz:7001";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      return response.data;
      // return [];
    }
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = request;