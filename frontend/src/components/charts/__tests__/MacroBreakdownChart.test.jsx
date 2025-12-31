import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MacroBreakdownChart from '../MacroBreakdownChart';

// Mock @nivo/pie
vi.mock('@nivo/pie', () => ({
  ResponsivePie: ({ data }) => (
    <div data-testid="pie-chart">
      {data.map(item => (
        <div key={item.id} data-testid={`pie-slice-${item.id}`}>
          {item.label}: {item.value}g
        </div>
      ))}
    </div>
  )
}));

describe('MacroBreakdownChart', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders chart with valid data', () => {
    const mockData = {
      protein: 150,
      carbs: 200,
      fat: 65,
      fiber: 30,
      calories: 2000
    };

    render(<MacroBreakdownChart data={mockData} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Protein')).toBeInTheDocument();
    expect(screen.getByText(/Protein: 150g/)).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<MacroBreakdownChart data={null} />);

    expect(screen.getByText(/no macros logged yet/i)).toBeInTheDocument();
    expect(screen.getByText(/log a meal to see breakdown/i)).toBeInTheDocument();
  });

  it('shows empty state when all values are zero', () => {
    const emptyData = {
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    render(<MacroBreakdownChart data={emptyData} />);

    expect(screen.getByText(/no macros logged yet/i)).toBeInTheDocument();
  });

  it('filters out zero values from chart', () => {
    const partialData = {
      protein: 100,
      carbs: 0,
      fat: 50,
      fiber: 0
    };

    render(<MacroBreakdownChart data={partialData} />);

    expect(screen.getByTestId('pie-slice-Protein')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Fat')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-slice-Carbs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pie-slice-Fiber')).not.toBeInTheDocument();
  });

  it('renders with legend by default', () => {
    const mockData = {
      protein: 150,
      carbs: 200,
      fat: 65,
      fiber: 30
    };

    const { container } = render(<MacroBreakdownChart data={mockData} />);
    expect(container.querySelector('[data-testid="pie-chart"]')).toBeInTheDocument();
  });

  it('can hide legend when showLegend is false', () => {
    const mockData = {
      protein: 150,
      carbs: 200,
      fat: 65,
      fiber: 30
    };

    const { container } = render(<MacroBreakdownChart data={mockData} showLegend={false} />);
    expect(container.querySelector('[data-testid="pie-chart"]')).toBeInTheDocument();
  });

  it('handles missing macro values gracefully', () => {
    const incompleteData = {
      protein: 100,
      carbs: 150
      // missing fat and fiber
    };

    render(<MacroBreakdownChart data={incompleteData} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText(/Protein: 100g/)).toBeInTheDocument();
    expect(screen.getByText(/Carbs: 150g/)).toBeInTheDocument();
  });

  it('rounds decimal values to one decimal place', () => {
    const decimalData = {
      protein: 123.456,
      carbs: 234.789,
      fat: 67.123,
      fiber: 28.999
    };

    render(<MacroBreakdownChart data={decimalData} />);

    expect(screen.getByText(/Protein: 123.5g/)).toBeInTheDocument();
    expect(screen.getByText(/Carbs: 234.8g/)).toBeInTheDocument();
    expect(screen.getByText(/Fat: 67.1g/)).toBeInTheDocument();
    expect(screen.getByText(/Fiber: 29g/)).toBeInTheDocument();
  });
});
