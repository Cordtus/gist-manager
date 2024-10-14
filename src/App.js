import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import GistList from './components/GistList';
import GistEditor from './components/GistEditor';
import FileConverter from './components/FileConverter';
import DeleteGist from './components/DeleteGist';
import './styles/index.css';

const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <Switch>
        <Route exact path="/" component={Dashboard} />
        <Route path="/gists" component={GistList} />
        <Route path="/gist/:id?" component={GistEditor} />
        <Route path="/convert" component={FileConverter} />
        <Route path="/delete/:id" component={DeleteGist} />
      </Switch>
    </Layout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;