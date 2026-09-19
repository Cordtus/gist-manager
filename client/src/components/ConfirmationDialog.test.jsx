import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmationDialog from './ConfirmationDialog';

describe('ConfirmationDialog', () => {
	it('opens as a modal and reports confirm and cancel actions', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		const onClose = vi.fn();

		render(
			<ConfirmationDialog
				isOpen
				onClose={onClose}
				onConfirm={onConfirm}
				title="Delete Gist"
				message="Are you sure?"
			/>,
		);

		expect(screen.getByRole('dialog').open).toBe(true);

		await user.click(screen.getByRole('button', { name: 'Confirm' }));
		expect(onConfirm).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('renders nothing while closed', () => {
		render(
			<ConfirmationDialog
				isOpen={false}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
				title="Delete Gist"
				message="Are you sure?"
			/>,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
