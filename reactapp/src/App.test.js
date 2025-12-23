import { render } from '@testing-library/react';

jest.mock('axios', () =>
{
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  return {
    __esModule: true,
    default: {
      ...mockClient,
      create: jest.fn(() => mockClient),
    },
    create: jest.fn(() => mockClient),
    ...mockClient,
  };
});

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: () => null,
  useNavigate: () => jest.fn(),
}));

import App from './App';

test('renders app without crashing', () =>
{
  render(<App />);
});
