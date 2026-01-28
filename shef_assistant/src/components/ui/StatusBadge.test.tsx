import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders children correctly', () => {
    render(<StatusBadge status="success">Active</StatusBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies success styles', () => {
    render(<StatusBadge status="success">Success</StatusBadge>);
    const badge = screen.getByText('Success');
    expect(badge.className).toContain('bg-green');
  });

  it('applies error styles', () => {
    render(<StatusBadge status="error">Error</StatusBadge>);
    const badge = screen.getByText('Error');
    expect(badge.className).toContain('bg-red');
  });

  it('applies warning styles', () => {
    render(<StatusBadge status="warning">Warning</StatusBadge>);
    const badge = screen.getByText('Warning');
    expect(badge.className).toContain('bg-yellow');
  });

  it('applies info styles', () => {
    render(<StatusBadge status="info">Info</StatusBadge>);
    const badge = screen.getByText('Info');
    expect(badge.className).toContain('bg-blue');
  });

  it('applies small size by default', () => {
    render(<StatusBadge status="neutral">Default</StatusBadge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('text-xs');
  });

  it('applies medium size when specified', () => {
    render(<StatusBadge status="neutral" size="md">Medium</StatusBadge>);
    const badge = screen.getByText('Medium');
    expect(badge.className).toContain('text-sm');
  });
});
