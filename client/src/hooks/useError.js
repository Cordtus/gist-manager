/**
 * useError Hook
 * Standardized error state management for components
 */
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing error state with optional auto-clear
 * @param {number} [autoClearMs=0] - Auto-clear error after ms (0 = disabled)
 * @returns {{ error: string|null, setError: (msg: string|null) => void, clearError: () => void }}
 */
export const useError = (autoClearMs = 0) => {
	const [error, setErrorState] = useState(null);
	const timeoutRef = useRef(null);

	// Clear any existing timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const setError = useCallback((message) => {
		// Clear any existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		setErrorState(message);

		// Set auto-clear timeout if enabled and message is truthy
		if (autoClearMs > 0 && message) {
			timeoutRef.current = setTimeout(() => {
				setErrorState(null);
			}, autoClearMs);
		}
	}, [autoClearMs]);

	const clearError = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setErrorState(null);
	}, []);

	return { error, setError, clearError };
};

export default useError;
