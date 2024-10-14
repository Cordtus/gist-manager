const axios = require('axios');

exports.getGists = async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com/gists', {
      headers: { Authorization: `token ${req.headers.authorization}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching gists' });
  }
};

exports.createGist = async (req, res) => {
  try {
    const response = await axios.post('https://api.github.com/gists', req.body, {
      headers: { Authorization: `token ${req.headers.authorization}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error creating gist' });
  }
};