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
  let formattedData = data;
  
  switch (typeof data) {
    case "object":
      // Handle Error objects to preserve stack traces
      if (data instanceof Error) {
        formattedData = `${data.message}\n${data.stack}`;
      } else {
        formattedData = JSON.stringify(data, null, 2);
      }
      break;
  }
  
  const timestamp = time.toISOString();
  const message = `\n[$${timestamp}] -------${type.toUpperCase()}-------\n${formattedData}`;

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
