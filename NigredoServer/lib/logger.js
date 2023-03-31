const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

const logfile = path.resolve("./output/logfile.txt");

const error = (e) => {
  appendLog("Error", e);
  console.log(chalk.bold.red(e));
};
const warning = (w) => {
  appendLog("Warning", w);
  console.log(chalk.bold.yellow(w));
};
const info = (i) => {
  appendLog("Info", i);
  console.log(chalk.bold.blue(i));
};

const appendLog = (type, data, time = new Date()) => {
  switch (typeof data) {
    case "object":
      data = JSON.stringify(data);
  }
  const message = `\n\n--------------${time.toString()}----------------\n${type}:\n${data}`;

  if (!fs.existsSync(logfile)) {
    fs.writeFileSync(logfile, message);
  } else {
    fs.appendFileSync(logfile, message);
  }
};

module.exports = {
  error,
  warning,
  info,
};
