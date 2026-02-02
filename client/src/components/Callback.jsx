/**
 * OAuth Callback Component
 * Handles GitHub OAuth redirect and completes authentication flow.
 * @module components/Callback
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
import { ErrorState } from './ui/error-state';

const isDevelopment = process.env.NODE_ENV === 'development';

const Callback = () => {
	const { login, isAuthenticated, loading } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [error, setError] = useState(null);
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		const handleCallback = async () => {
			// Wait for initial auth status check to complete
			if (loading) {
				return;
			}

			// If already authenticated (e.g., existing session), redirect home
			if (isAuthenticated) {
				sessionStorage.removeItem('oauth_state');
				sessionStorage.removeItem('code_verifier');
				navigate('/');
				return;
			}

			try {
				setIsProcessing(true);

				// Parse URL parameters
				const searchParams = new URLSearchParams(location.search);
				const code = searchParams.get('code');
				const returnedState = searchParams.get('state');
				const errorParam = searchParams.get('error');
				const errorDescription = searchParams.get('error_description');

				// Check for OAuth error from GitHub
				if (errorParam) {
					const errorMsg = errorDescription || errorParam;
					setError(`GitHub authentication error: ${errorMsg}`);
					setIsProcessing(false);
					return;
				}

				// Validate we have required params
				if (!code) {
					setError('No authorization code received from GitHub. Authentication failed.');
					setIsProcessing(false);
					return;
				}

				if (!returnedState) {
					setError('No state parameter received. Authentication failed.');
					setIsProcessing(false);
					return;
				}

				// Verify we have the code verifier from the initial request
				const codeVerifier = sessionStorage.getItem('code_verifier');
				if (!codeVerifier) {
					setError('OAuth flow was interrupted. Please try logging in again.');
					setIsProcessing(false);
					return;
				}

				// Call login which handles state verification and token exchange
				const success = await login(code, returnedState);

				if (success) {
					navigate('/');
				} else {
					setError('Authentication failed. Please try again.');
					setIsProcessing(false);
				}
			} catch (error) {
				const errorMsg = isDevelopment ? error.message : 'Please try again later.';
				setError(`Authentication failed: ${errorMsg}`);
				setIsProcessing(false);
			}
		};

		handleCallback();
	}, [login, location, navigate, isAuthenticated, loading]);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] p-6">
				<ErrorState message={error} title="Authentication Error" variant="fullpage" className="mb-6" />
				<div className="flex space-x-4">
					<button
						onClick={() => navigate('/')}
						className="button secondary"
					>
						Return to Homepage
					</button>
					<button
						onClick={() => window.location.href = '/'}
						className="button primary"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center p-6">
			<Spinner />
			<p className="mt-4 text-lg font-medium">
				{isProcessing ? 'Processing GitHub authentication...' : 'Redirecting...'}
			</p>
			<p className="mt-2 text-sm text-secondary">
				Please wait while we complete the GitHub authentication process.
			</p>
		</div>
	);
};

export default Callback;
