import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './Tooltip';

describe('Tooltip interactions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels pending help bubbles when the trigger is clicked', () => {
    vi.useFakeTimers();
    render(
      <Tooltip label="Ajuda exclusiva">
        <button type="button">Abrir painel</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Abrir painel' });
    fireEvent.pointerEnter(trigger);
    fireEvent.focus(trigger);
    fireEvent.click(trigger);
    act(() => vi.advanceTimersByTime(350));

    expect(screen.queryByText('Ajuda exclusiva')).not.toBeInTheDocument();
  });
});
