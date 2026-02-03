// App.js

import './styles/globals.css';
import './styles/gistEditor.css';
import './styles/gistViewer.css';
import './styles/markdownPreview.css';

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Callback from './components/Callback';
import GistList from './components/GistList';
import GistEditor from './components/GistEditor';
import GistViewer from './components/GistViewer';
import FileConverter from './components/FileConverter';
import { UserProfile } from './components/UserProfile';
import ThemeColorSelector from './components/ThemeColorSelector';
import ThemeSandbox from './components/ThemeSandbox';

const AppContent = () => {
	const auth = useAuth();

	if (!auth) {
		return <div>Error: Authentication context is unavailable</div>;
	}

	const { loading } = auth;

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<Layout>
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/callback" element={<Callback />} />
				<Route path="/my-gists" element={<GistList />} />
				<Route path="/gists" element={<GistList />} />
				<Route path="/gist/:id?" element={<GistEditor />} />
				<Route path="/view/:id" element={<GistViewer />} />
				<Route path="/view/:id/:filename" element={<GistViewer />} />
				<Route path="/convert" element={<FileConverter />} />
				<Route path="/profile" element={<UserProfile />} />
				{process.env.NODE_ENV === 'development' && (
					<>
						<Route path="/theme-sandbox" element={<ThemeSandbox />} />
						<Route path="/theme-colors" element={<ThemeColorSelector />} />
					</>
				)}
			</Routes>
		</Layout>
	);
};

const App = () => (
	<ThemeProvider>
		<AuthProvider>
			<ToastProvider>
				<Router>
					<AppContent />
				</Router>
			</ToastProvider>
		</AuthProvider>
	</ThemeProvider>
);

export default App;
