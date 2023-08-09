const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

const logfile = {
  info: path.resolve("./output/info.txt"),
  warning: path.resolve("./output/warning.txt"),
  error: path.resolve("./output/error.txt"),
};

const error = (e) => {
  appendLog("error", e);
  console.log(chalk.bold.red(e));
};
const warning = (w) => {
  appendLog("warning", w);
  console.log(chalk.bold.yellow(w));
};
const info = (i) => {
  appendLog("info", i);
  console.log(chalk.bold.blue(i));
};

const appendLog = (type, data, time = new Date()) => {
  switch (typeof data) {
    case "object":
      data = JSON.stringify(data);
  }
  const message = `\n\n--------------${time.toString()}----------------\n${type}:\n${data}`;

  if (!fs.existsSync(logfile[type])) {
    fs.writeFileSync(logfile[type], message);
  } else {
    fs.appendFileSync(logfile[type], message);
  }
};

module.exports = {
  error,
  warning,
  info,
};
