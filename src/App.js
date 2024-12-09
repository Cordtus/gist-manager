import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Callback from './components/Callback';
import GistList from './components/GistList';
import GistEditor from './components/GistEditor';
import FileConverter from './components/FileConverter';
import DeleteGist from './components/DeleteGist';
import Onboard from './components/Onboard'; // Import the Onboard component
import './styles/index.css';

// DebugRouter component to log the current route
const DebugRouter = () => {
  const location = useLocation();
  console.log('Current Route:', location.pathname);
  return null; // This component does not render anything visible
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Layout>
        <DebugRouter /> {/* Debug route changes */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/gists" element={<GistList />} />
          <Route path="/gist/:id?" element={<GistEditor />} />
          <Route path="/convert" element={<FileConverter />} />
          <Route path="/delete/:id" element={<DeleteGist />} />
          <Route path="/onboard" element={<Onboard />} /> {/* New Onboard route */}
          <Route path="*" element={<div>Page Not Found</div>} /> {/* Catch-all route */}
        </Routes>
      </Layout>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
