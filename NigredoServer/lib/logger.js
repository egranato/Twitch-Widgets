const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

const logDir = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve("./output");

fs.mkdirSync(logDir, { recursive: true });

const logfile = {
  info: path.resolve(logDir, "info.txt"),
  warning: path.resolve(logDir, "warning.txt"),
  error: path.resolve(logDir, "error.txt"),
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
