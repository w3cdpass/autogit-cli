#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import ora from 'ora';

const git = simpleGit();

async function saveGitHistory() {
  try {
    const log = await git.log();
    const history = log.all.map(commit => ({    hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author: commit.author_name,
    }));
    
    const historyPath = path.join(path.resolve('.'), 'git_history.json');
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    console.log((`Git history saved to ${chalk.bgGray(historyPath)}`));
  } catch (error) {
    console.error(chalk.red(`Failed to fetch Git history: ${error.message}`));
  }
}

const args = process.argv.slice(2);
if (args.includes('-h')) {
  await saveGitHistory();
  process.exit(0);
}

async function checkGitignore() {
  const gitignorePath = path.join(path.resolve('.'), '.gitignore');
  const commonIgnoredFiles = [
    'node_modules/',
    'dist/',
    '.env',
    '*.log',
    'coverage/',
    '.DS_Store',
    'git_history.json'
  ];

  let createGitignore = false;

  if (!fs.existsSync(gitignorePath)) {
    const { create } = await inquirer.prompt({
      type: 'confirm',
      name: 'create',
      message: 'No .gitignore file found. Would you like to create one?',
      default: true,
    });
    createGitignore = create;
  }

  const existingEntries = createGitignore
    ? []
    : fs.readFileSync(gitignorePath, 'utf-8').split('\n').filter(Boolean);

  const newEntries = commonIgnoredFiles.filter(entry => !existingEntries.includes(entry));

  if (newEntries.length > 0) {
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
    }
  }
}

async function getGitStatus() {
  const status = await git.status();
  return {
    untrackedFiles: status.not_added,
    modifiedFiles: status.modified,
  };
}

async function promptForAddingFiles(files) {
  if (files.length === 0) {
    console.log(chalk.cyanBright('Project is up to date.'));
    return false;  // Return false if there are no files to add
  }

  const { addMethod } = await inquirer.prompt({
    type: 'confirm',
    name: 'addMethod',
    message: chalk.cyan('Add files automatically (y) or manually (n)?'),
    default: true,
  });


  const getFileDiffStats = async (file) => {
    let insertions = 0;
    let deletions = 0;

    const unstagedDiff = await git.diff([file]);
    insertions += (unstagedDiff.match(/\n\+/g) || []).length;
    deletions += (unstagedDiff.match(/\n-/g) || []).length;

    const stagedDiff = await git.diff(['--cached', file]);
    insertions += (stagedDiff.match(/\n\+/g) || []).length;
    deletions += (stagedDiff.match(/\n-/g) || []).length;

    return `${chalk.white(file)} [${chalk.green(`+${insertions}`)} ${chalk.red(`-${deletions}`)}]`;
  };

  if (addMethod) {
    await git.add(files);
    const stats = await Promise.all(files.map(async (file) => await getFileDiffStats(file)));
    console.log(`${chalk.white('Adding files:')}\n${stats.join(', ')}`);
  } else {
    const { selectedFiles } = await inquirer.prompt({
      type: 'checkbox',
      name: 'selectedFiles',
      message: 'Select files to add:',
      choices: files,
      loop: false,
    });
    await git.add(selectedFiles);
    const stats = await Promise.all(selectedFiles.map(async (file) => await getFileDiffStats(file)));
    console.log(`${chalk.white('Adding files:')}\n${stats.join(', ')}`);
  }
  
  return true;  
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
  return commitMessage;
}


async function pushToBranch(commitMessage) {
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
    color: 'white',
    spinner: 'dots',
  }).start();





  try {
    await git.push('origin', branch);
    spinner.stop();

    const log = await git.log({ maxCount: 1 });
    const latestCommit = log.latest;
    const sha = latestCommit.hash.slice(0, 7);




    console.log(
      `\n{ ${chalk.white('Branch')}: "${chalk.green(branch)}", ${chalk.white('SHA')}: "${chalk.green(sha)}", ${chalk.white('Commit')}: "${chalk.green(commitMessage)}" }`
    );
  } catch (error) {
    spinner.fail(chalk.red('Failed to push code to GitHub.'));
    console.error(chalk.red(error.message));
  }
}

async function main() {
  try {
    await checkGitignore();

    const { untrackedFiles, modifiedFiles } = await getGitStatus();
    const filesToDisplay = [
      ...modifiedFiles,
      ...untrackedFiles.filter(file => fs.existsSync(file)),
    ];
    
    if (filesToDisplay.length > 0) {
      await promptForAddingFiles(filesToDisplay);
    }

    const commitMessage = await commitChanges();
    await pushToBranch(commitMessage);
  } catch (err) {
    console.error(chalk.red(`An error occurred: ${err.message}`));
  }
}

main();
