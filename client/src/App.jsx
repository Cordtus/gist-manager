// App.js

import './styles/globals.css';
import { lazy, Suspense } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GistDataProvider } from './contexts/GistDataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';

const Callback = lazy(() => import('./components/Callback'));
const Explore = lazy(() => import('./components/Explore'));
const FileConverter = lazy(() => import('./components/FileConverter'));
const GistEditor = lazy(() => import('./components/GistEditor'));
const GistList = lazy(() => import('./components/GistList'));
const GistViewer = lazy(() => import('./components/GistViewer'));
const ThemeColorSelector = lazy(() => import('./components/ThemeColorSelector'));
const ThemeSandbox = lazy(() => import('./components/ThemeSandbox'));
const UserProfile = lazy(() =>
	import('./components/UserProfile').then(({ UserProfile: Profile }) => ({ default: Profile })),
);

const RouteLoading = ({ restoringSession }) => (
	<div role="status" className="flex items-center gap-3 py-12 text-muted-foreground">
		<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
		<p>{restoringSession ? 'Restoring your session…' : 'Loading page…'}</p>
	</div>
);

const AppContent = () => {
	const auth = useAuth();

	if (!auth) {
		return <div>Error: Authentication context is unavailable</div>;
	}

	return (
		<Layout>
			{auth.loading ? (
				<RouteLoading restoringSession />
			) : (
				<Suspense fallback={<RouteLoading restoringSession={false} />}>
					<Routes>
						<Route path="/" element={<Dashboard />} />
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/callback" element={<Callback />} />
						<Route path="/my-gists" element={<GistList />} />
						<Route path="/gists" element={<GistList />} />
						<Route path="/explore" element={<Explore />} />
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
				</Suspense>
			)}
		</Layout>
	);
};

const App = () => (
	<ThemeProvider>
		<AuthProvider>
			<GistDataProvider>
				<ToastProvider>
					<Router>
						<AppContent />
					</Router>
				</ToastProvider>
			</GistDataProvider>
		</AuthProvider>
	</ThemeProvider>
);

export default App;
