// App.js

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import Layout from './components/Layout.js';
import Dashboard from './components/Dashboard.js';
import Callback from './components/Callback.js';
import GistList from './components/GistList.js';
import GistEditor from './components/GistEditor.js';
import FileConverter from './components/FileConverter.js';
import DeleteGist from './components/DeleteGist.js';
import './styles/styles.css';

// AppContent Component for Routes
const AppContent = () => {
  const { loading, user } = useAuth(); // Use AuthContext to check loading and user state

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20%' }}>Loading...</div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20%' }}>
        <h1>Please log in to continue</h1>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="/gists" element={<GistList />} />
      <Route path="/gist/:id?" element={<GistEditor />} />
      <Route path="/convert" element={<FileConverter />} />
      <Route path="/delete/:id" element={<DeleteGist />} />
    </Routes>
  );
};

// Main App Component
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Layout>
        <AppContent />
      </Layout>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
