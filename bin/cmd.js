import inquirer from 'inquirer';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import ora from 'ora';
import 'inquirer-autocomplete-standalone';

const git = simpleGit();

async function pushToBranch() {
  const remotes = await git.getRemotes();
  const remoteNames = remotes.map(remote => remote.name);

  if (remoteNames.length === 0) {
    console.log(chalk.red('No remote repository found.'));
    return;
  }

  const { branch } = await inquirer.prompt({
    type: 'input',
    name: 'branch',
    message: 'Enter the branch name to push to:',
    default: 'main',
  });

  const exists = await git.branch(['-r']).then(data =>
    Object.keys(data.branches).some(r => r.includes(branch))
  );

  if (!exists) {
    console.log(chalk.red(`Branch "${branch}" does not exist on remote.`));
    return;
  }

  // Start a loading spinner for pushing
  const spinner = ora({
    text: `Pushing code to branch "${branch}"...`,
    color: 'cyan',
    spinner: 'dots',
  }).start();

  try {
    await git.push('origin', branch);
    spinner.succeed(`Successfully pushed to branch "${branch}".`);
  } catch (error) {
    spinner.fail('Failed to push code to GitHub.');
    console.error(chalk.red(error.message));
  }
}

// Rest of your code
async function main() {
  // Call the other functions as in the original main() function
  await checkGitignore();
  const { untrackedFiles, modifiedFiles } = await getGitStatus();
  console.log(chalk.yellow('Untracked Files:'), formatFiles(untrackedFiles, 'U'));
  console.log(chalk.yellow('Modified Files:'), formatFiles(modifiedFiles, 'M'));

  const allFiles = [...untrackedFiles, ...modifiedFiles];
  await promptForAddingFiles(allFiles);
  await commitChanges();
  await pushToBranch();
}

main();
