import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import App from '../App';
import theme from '../theme';

// Mock react-datasheet-grid to avoid ResizeObserver issues in jsdom
vi.mock('react-datasheet-grid', () => ({
  DataSheetGrid: ({ value }: { value: unknown[] }) => (
    <div data-testid="mock-datasheet-grid">
      Mock DataSheetGrid with {value?.length ?? 0} rows
    </div>
  ),
  textColumn: {},
  floatColumn: {},
  keyColumn: (key: string, column: unknown) => ({ key, ...column as object }),
}));

describe('App', () => {
  it('renders the application title', () => {
    render(
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    );
    
    expect(screen.getByText('SankeyMATIC')).toBeInTheDocument();
  });

  it('renders the Sankey Chart area', () => {
    render(
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    );
    
    // When there are no flows, the placeholder message is shown
    expect(screen.getByText(/Add flows in the Data Editor/i)).toBeInTheDocument();
  });

  it('renders the Data Editor area', () => {
    render(
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    );
    
    expect(screen.getByText('Data Editor')).toBeInTheDocument();
  });

  it('renders color mode toggle button', () => {
    render(
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    );
    
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it('renders toolbar with undo/redo buttons', () => {
    render(
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    );
    
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
  });
});
