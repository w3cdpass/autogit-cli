const simpleGit = require('simple-git');
const chalk = require('chalk');
const { createPullRequest } = require('./apiUtils');

const git = simpleGit();

async function init() {
  console.log(chalk.green('Initializing autogit-cli...'));
  // Initialization logic
}

async function status() {
  const statusSummary = await git.status();
  console.log(chalk.blue('Current repo status:'), statusSummary);
}

async function commit(message) {
  await git.add('./*');
  await git.commit(message);
  console.log(chalk.green(`Committed with message: "${message}"`));
}

async function branch(branchName) {
  await git.checkoutLocalBranch(branchName);
  console.log(chalk.green(`Switched to new branch: ${branchName}`));
}

async function createPR() {
  try {
    const status = await git.status();
    if (status.current === 'main' || status.current === 'master') {
      console.log(chalk.red('Switch to a feature branch to create a PR.'));
      return;
    }

    const owner = 'your-username';
    const repo = 'your-repo';
    const head = status.current;
    const base = 'main';
    const title = `Pull Request from ${head}`;
    const body = 'Description of the PR';
    const token = process.env.GITHUB_TOKEN;

    const prData = await createPullRequest(owner, repo, head, base, title, body, token);
    console.log(chalk.green('Pull Request created:'), prData.html_url);
  } catch (error) {
    console.error(chalk.red('Failed to create PR:'), error.message);
  }
}

module.exports = { init, status, commit, branch, createPR };
