const axios = require('axios');

const GITHUB_API_URL = 'https://api.github.com';

async function createPullRequest(owner, repo, head, base, title, body, token) {
  try {
    const response = await axios.post(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`,
      { title, head, base, body },
      { headers: { Authorization: `token ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating pull request:', error.message);
    throw error;
  }
}

module.exports = { createPullRequest };
