// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Callback from './components/Callback';
import GistList from './components/GistList';
import GistEditor from './components/GistEditor';
import FileConverter from './components/FileConverter';
import { UserProfile } from './components/UserProfile';
import SharedGistList from './components/SharedGistList';
import SharedGistDetail from './components/SharedGistDetail';
import ThemeColorSelector from './components/ThemeColorSelector';
import ThemeSandbox from './components/ThemeSandbox';
import './styles/index.css';
import './styles/theme.css';
import './styles/markdown-preview.css';

const AppContent = () => {
  const auth = useAuth();
  
  // Guard against undefined auth
  if (!auth) {
    return <div>Error: Authentication context is unavailable</div>;
  }
  
  const { loading } = auth;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen dark:bg-dark-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/gists" element={<GistList />} />
        <Route path="/gist/:id?" element={<GistEditor />} />
        <Route path="/convert" element={<FileConverter />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/theme-sandbox" element={<ThemeSandbox />} />
        <Route path="/theme-colors" element={<ThemeColorSelector />} />
        <Route path="/shared" element={<SharedGistList />} />
        <Route path="/shared/:sharedId" element={<SharedGistDetail />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  </ThemeProvider>
);

export default App;