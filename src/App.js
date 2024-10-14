import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { authenticateWithGitHub, getCurrentUser } from './services/api/auth';
import Layout from './components/Layout';
import GistList from './components/GistList';
import GistEditor from './components/GistEditor';
import FileConverter from './components/FileConverter';
import Dashboard from './components/Dashboard';

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      fetchCurrentUser();
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleLogin = async (code) => {
    try {
      const token = await authenticateWithGitHub(code);
      localStorage.setItem('github_token', token);
      await fetchCurrentUser();
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <Router>
      <Layout user={user}>
        <Switch>
          <Route exact path="/" component={Dashboard} />
          <Route path="/gists" component={GistList} />
          <Route path="/gist/:id?" component={GistEditor} />
          <Route path="/convert" component={FileConverter} />
        </Switch>
      </Layout>
    </Router>
  );
};

export default App;