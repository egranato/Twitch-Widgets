const chalk = require("chalk");

const error = (error) => {
  console.log(chalk.bold.red(error));
};
const warning = (warning) => {
  console.log(chalk.bold.yellow(warning));
};
const info = (info) => {
  console.log(chalk.bold.blue(info));
};

module.exports = {
  error,
  warning,
  info,
};
