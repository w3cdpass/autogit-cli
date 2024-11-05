const simpleGit = require('simple-git');

async function checkStatus() {
  const git = simpleGit();
  return await git.status();
}

module.exports = { checkStatus };
