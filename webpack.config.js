"use strict";

const Path = require("path");

const base = {
  mode: "production",
  devtool: "source-map",
  optimization: {
    minimize: false,
  },
  entry: {
    "sucrase.js": Path.resolve("./sucrase-transform.js"),
  },
  target: "node",
  output: {
    filename: `[name]`,
    path: Path.resolve("dist"),
    libraryTarget: "commonjs2",
  },

  node: {
    __filename: false,
    __dirname: false,
  },
};

module.exports = base;
