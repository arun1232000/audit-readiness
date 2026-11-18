import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeadStep } from '../../src/components/audit/LeadStep';

describe('<LeadStep />', () => {
  it('shows specific inline errors and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LeadStep onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /show my result/i }));

    expect(await screen.findByText('Please tell us your name.')).toBeInTheDocument();
    expect(screen.getByText(/so we can send your result/i)).toBeInTheDocument();
    expect(screen.getByText(/add a phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/tick the box/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('4 things need fixing');
    expect(screen.getByLabelText(/full name/i)).toHaveFocus();
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid lead with an E.164 phone number', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LeadStep onSubmit={onSubmit} defaultCountry="CA" />);

    await user.type(screen.getByLabelText(/full name/i), 'Sam Patel');
    await user.type(screen.getByRole('textbox', { name: /mobile/i }), '7805551234');
    await user.type(screen.getByLabelText(/^email/i), 'Sam@Example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /show my result/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toEqual({ fullName: 'Sam Patel', email: 'sam@example.com', phone: '+17805551234', consent: true });
    expect(onSubmit.mock.calls[0]![1]).toBe(''); // honeypot untouched
  });
});
