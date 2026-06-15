const chalk = require('chalk');

module.exports = {
    info:  (message) => console.log(chalk.dim.blue('•') + chalk.dim(' info  - ') + message),
    ready: (message) => console.log(chalk.dim.green('•') + chalk.dim(' ready - ') + message),
    warn:  (message) => console.log(chalk.dim.yellow('•') + chalk.dim(' warn  - ') + message),
    error: (message) => console.log(chalk.dim.red('•') + chalk.dim(' error - ') + message),
    event: (message) => console.log(chalk.dim.cyan('•') + chalk.dim(' event - ') + message)
};
