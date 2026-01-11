/**
 * ErrorState Component
 * Consistent error display across the application
 * Supports multiple variants: inline, card, banner, fullpage
 */
import React from 'react';
import { XCircle, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

/**
 * @param {Object} props
 * @param {string} props.message - Error message to display
 * @param {string} [props.title] - Optional error title
 * @param {'inline'|'card'|'banner'|'fullpage'} [props.variant='card'] - Display variant
 * @param {boolean} [props.showIcon=true] - Whether to show error icon
 * @param {() => void} [props.onRetry] - Retry callback
 * @param {() => void} [props.onDismiss] - Dismiss callback
 * @param {string} [props.className] - Additional CSS classes
 */
const ErrorState = ({
	message,
	title,
	variant = 'card',
	showIcon = true,
	onRetry,
	onDismiss,
	className
}) => {
	const baseClasses = 'bg-destructive/10 border-destructive/20 text-destructive';

	const variantClasses = {
		inline: 'flex items-center gap-2 text-sm p-2 rounded border',
		card: 'p-4 rounded-lg border',
		banner: 'px-4 py-2 border-b',
		fullpage: 'min-h-[200px] flex flex-col items-center justify-center p-6 rounded-lg border'
	};

	const contentLayout = {
		inline: 'flex items-center gap-2 flex-1',
		card: 'flex items-start gap-3',
		banner: 'flex items-center justify-center gap-4 w-full',
		fullpage: 'flex flex-col items-center text-center'
	};

	const iconSize = variant === 'fullpage' ? 'h-12 w-12 mb-4' : 'h-5 w-5';

	return (
		<div
			className={cn(baseClasses, variantClasses[variant], className)}
			role="alert"
			aria-live="polite"
		>
			<div className={cn(contentLayout[variant], variant === 'banner' && 'max-w-4xl mx-auto')}>
				{showIcon && (
					<XCircle className={cn(iconSize, 'flex-shrink-0')} aria-hidden="true" />
				)}

				<div className={cn(
					variant === 'fullpage' && 'space-y-2',
					variant === 'inline' && 'flex-1'
				)}>
					{title && (
						<p className="font-semibold">{title}</p>
					)}
					<p className={cn(title && 'text-sm opacity-90')}>{message}</p>
				</div>

				{/* Actions container */}
				{(onRetry || onDismiss) && (
					<div className={cn(
						'flex items-center gap-2',
						variant === 'fullpage' && 'mt-4',
						variant === 'card' && 'ml-auto',
						variant === 'inline' && 'ml-2'
					)}>
						{onRetry && (
							<Button
								variant="destructive"
								size={variant === 'inline' ? 'sm' : 'default'}
								onClick={onRetry}
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Retry
							</Button>
						)}
						{onDismiss && (
							<button
								onClick={onDismiss}
								className="p-1 hover:bg-destructive/20 rounded transition-colors"
								aria-label="Dismiss error"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export { ErrorState };
