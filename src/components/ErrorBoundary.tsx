import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
} from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app.
 * 
 * Requirements: 10.4
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // In production, you might want to report to an error tracking service
    // reportErrorToService(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong' } = this.props;
      const { error } = this.state;

      return (
        <Box
          w="100%"
          h="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <VStack spacing={4} maxW="500px" textAlign="center">
            <Alert
              status="error"
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              borderRadius="md"
              p={6}
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                {fallbackTitle}
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                An error occurred while rendering this component.
                {error && (
                  <Code
                    display="block"
                    mt={2}
                    p={2}
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    wordBreak="break-word"
                  >
                    {error.message}
                  </Code>
                )}
              </AlertDescription>
            </Alert>

            <Button colorScheme="blue" onClick={this.handleRetry}>
              Try Again
            </Button>

            <Text fontSize="sm" color="gray.500">
              If the problem persists, try refreshing the page or clearing your browser data.
            </Text>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
