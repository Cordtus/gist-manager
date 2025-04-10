const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://api.github.com/repos/Cordtus/gist-manager/contents/public';
const BRANCH = 'dev'; // Specify the branch
const OUTPUT_DIR = './downloads/public';

// GitHub token for authentication (if needed)
const GITHUB_TOKEN = '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'; // Optional: Add your GitHub Personal Access Token

async function fetchFiles() {
  try {
    // Fetch the list of files in the directory
    const response = await axios.get(`${BASE_URL}?ref=${BRANCH}`, {
      headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    });

    const files = response.data;

    // Ensure the output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Download each file
    for (const file of files) {
      if (file.type === 'file') {
        const fileResponse = await axios.get(file.download_url, { responseType: 'arraybuffer' });
        const filePath = path.join(OUTPUT_DIR, file.name);

        fs.writeFileSync(filePath, fileResponse.data);
        console.log(`Downloaded: ${file.name}`);
      }
    }

    console.log('All files downloaded successfully!');
  } catch (error) {
    console.error('Error fetching files:', error.message);
  }
}

fetchFiles();
