import { useEffect, useRef } from 'react';
import { Button } from './ui/button';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
	const dialogRef = useRef(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!isOpen || !dialog) return;
		if (typeof dialog.showModal === 'function') dialog.showModal();
		else dialog.setAttribute('open', '');
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<dialog
			ref={dialogRef}
			onCancel={onClose}
			onClose={onClose}
			className="w-full max-w-lg rounded-lg bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50"
		>
			<div className="px-4 pb-4 pt-5 sm:p-6">
				<h3 className="text-lg font-medium">{title}</h3>
				<p className="mt-2 text-sm text-muted-foreground">{message}</p>
			</div>
			<div className="flex flex-row-reverse gap-2 bg-muted px-4 py-3 sm:px-6">
				<Button variant="destructive" onClick={onConfirm}>
					Confirm
				</Button>
				<Button variant="outline" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</dialog>
	);
};

export default ConfirmationDialog;
