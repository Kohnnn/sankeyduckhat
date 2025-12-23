import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Color mode configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Custom colors for SankeyMATIC
const colors = {
  brand: {
    50: '#e6f7ff',
    100: '#b3e0ff',
    200: '#80caff',
    300: '#4db3ff',
    400: '#1a9dff',
    500: '#0080e6',
    600: '#0066b3',
    700: '#004d80',
    800: '#00334d',
    900: '#001a1a',
  },
  sankey: {
    node: '#4a90d9',
    link: '#a0c4e8',
    highlight: '#ff6b6b',
  },
};

// Component style overrides
const components = {
  Button: {
    defaultProps: {
      colorScheme: 'brand',
    },
  },
};

// Semantic tokens for light/dark mode
const semanticTokens = {
  colors: {
    'bg.canvas': {
      default: 'white',
      _dark: 'gray.900',
    },
    'bg.surface': {
      default: 'gray.50',
      _dark: 'gray.800',
    },
    'bg.toolbar': {
      default: 'gray.100',
      _dark: 'gray.700',
    },
    'border.default': {
      default: 'gray.200',
      _dark: 'gray.600',
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  components,
  semanticTokens,
});

export default theme;
