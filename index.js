import inquirer from 'inquirer';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import ora from 'ora';

const git = simpleGit();

async function checkGitignore() {
  const gitignorePath = path.join(path.resolve('.'), '.gitignore');
  const commonIgnoredFiles = [
    'node_modules/',
    'dist/',
    '.env',
    '*.log',
    'coverage/',
    '.DS_Store',
  ];

  let createGitignore = false;

  // Prompt to create .gitignore if it doesn’t exist
  if (!fs.existsSync(gitignorePath)) {
    const { create } = await inquirer.prompt({
      type: 'confirm',
      name: 'create',
      message: 'No .gitignore file found. Would you like to create one?',
      default: true,
    });
    createGitignore = create;
  }

  // Gather existing entries if .gitignore exists, otherwise initialize to empty
  const existingEntries = createGitignore
    ? []
    : fs.readFileSync(gitignorePath, 'utf-8').split('\n').filter(Boolean);

  const newEntries = commonIgnoredFiles.filter(entry => !existingEntries.includes(entry));
  if (newEntries.length === 0) return console.log(chalk.blue('.gitignore is already up-to-date.'));

  // Allow user to select files to add to .gitignore
  const { includeInGitignore } = await inquirer.prompt({
    type: 'checkbox',
    name: 'includeInGitignore',
    message: 'Select files to add to .gitignore:',
    choices: newEntries,
  });

  if (includeInGitignore.length) {
    const content = includeInGitignore.join('\n');
    if (createGitignore) {
      fs.writeFileSync(gitignorePath, content);
      console.log(chalk.green('Created .gitignore with selected entries.'));
    } else {
      fs.appendFileSync(gitignorePath, `\n${content}`);
      console.log(chalk.green('Updated .gitignore.'));
    }
  } else {
    console.log(chalk.yellow('No new entries were added to .gitignore.'));
  }
}

async function getGitStatus() {
  const status = await git.status();
  return {
    untrackedFiles: status.not_added,
    modifiedFiles: status.modified,
  };
}

function formatFiles(files, type) {
  return files.map(file => `${file}: ${type}`).join(', ');
}

async function promptForAddingFiles(files) {
  const { addMethod } = await inquirer.prompt({
    type: 'confirm',
    name: 'addMethod',
    message: chalk.cyan('Add files automatically (y) or manually (n)?'),
    default: true,
  });

  if (addMethod) {
    await git.add(files);
    console.log(chalk.green('Files added automatically.'));
  } else {
    const { selectedFiles } = await inquirer.prompt({
      type: 'checkbox',
      name: 'selectedFiles',
      message: 'Select files to add:',
      choices: files,
      loop: false,
    });
    await git.add(selectedFiles);
    console.log(chalk.green('Files added manually.'));
  }
}

async function commitChanges() {
  const commitMessages = [
    'Update files',
    'Refactor code',
    'Fix bugs',
    'Enhance performance',
    'Add new feature',
  ];

  const { commitMessage } = await inquirer.prompt({
    type: 'list',
    name: 'commitMessage',
    message: 'Select a commit message:',
    choices: commitMessages,
  });

  await git.commit(commitMessage);
  console.log(chalk.green(`Committed with message: "${commitMessage}"`));
}

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

  const spinner = ora({
    text: `Pushing code to branch "${branch}"...`,
    color: 'cyan',
    spinner: 'dots',
  }).start();

  try {
    await git.push('origin', branch);
    spinner.succeed(chalk.green(`Successfully pushed to branch "${branch}".`));

    // Retrieve the latest commit SHA and message
    const log = await git.log({ maxCount: 1 });
    const latestCommit = log.latest;
    const commitInfo = `[${latestCommit.hash.slice(0, 7)}] ${latestCommit.message}`;

    console.log(chalk.green(`\nPushed commit: ${commitInfo}`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to push code to GitHub.'));
    console.error(chalk.red(error.message));
  }
}

async function main() {
  try {
    // Start with checking .gitignore
    await checkGitignore();

    // Get untracked and modified files
    const { untrackedFiles, modifiedFiles } = await getGitStatus();

    console.log(chalk.yellow('Untracked Files:'), formatFiles(untrackedFiles, 'U'));
    console.log(chalk.yellow('Modified Files:'), formatFiles(modifiedFiles, 'M'));

    const allFiles = [...untrackedFiles, ...modifiedFiles];
    await promptForAddingFiles(allFiles);

    await commitChanges();
    await pushToBranch();
  } catch (err) {
    console.error(chalk.red(`An error occurred: ${err.message}`));
  }
}

main();
