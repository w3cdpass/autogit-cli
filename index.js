import inquirer from 'inquirer';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import 'inquirer-autocomplete-standalone';

const git = simpleGit();

async function getGitStatus() {
  const status = await git.status();
  const untrackedFiles = status.not_added;
  const modifiedFiles = status.modified;

  return {
    untrackedFiles,
    modifiedFiles,
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

  await git.push('origin', branch);
  console.log(chalk.green(`Pushed to branch "${branch}".`));
}

async function checkGitignore() {
  const projectRoot = path.resolve('.');
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const commonIgnoredFiles = [
    'node_modules/',
    'dist/',
    '.env',
    '*.log',
    'coverage/',
    '.DS_Store',
  ];

  const { includeInGitignore } = await inquirer.prompt({
    type: 'checkbox',
    name: 'includeInGitignore',
    message: 'Select files to add to .gitignore:',
    choices: commonIgnoredFiles,
  });

  const gitignoreExists = fs.existsSync(gitignorePath);

  if (gitignoreExists) {
    fs.appendFileSync(gitignorePath, `\n${includeInGitignore.join('\n')}`);
    console.log(chalk.green('Updated .gitignore.'));
  } else {
    fs.writeFileSync(gitignorePath, includeInGitignore.join('\n'));
    console.log(chalk.green('Created .gitignore with selected entries.'));
  }
}

async function main() {
  try {
    const { untrackedFiles, modifiedFiles } = await getGitStatus();

    console.log(chalk.yellow('Untracked Files:'), formatFiles(untrackedFiles, 'U'));
    console.log(chalk.yellow('Modified Files:'), formatFiles(modifiedFiles, 'M'));

    const allFiles = [...untrackedFiles, ...modifiedFiles];
    await promptForAddingFiles(allFiles);

    await commitChanges();
    await pushToBranch();
    await checkGitignore();
  } catch (err) {
    console.error(chalk.red(err));
  }
}

main();
