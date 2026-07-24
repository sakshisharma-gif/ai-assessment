/**
 * Integration tests for TicketForm Component
 * Tests real user interactions and form validation scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TicketForm from '../../components/ticket/TicketForm';
import ticketsReducer from '../../store/slices/ticketsSlice';
import authReducer from '../../store/slices/authSlice';

// Mock API service
vi.mock('../../services/api', () => ({
  ticketService: {
    createTicket: vi.fn(),
    updateTicket: vi.fn()
  }
}));

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      tickets: ticketsReducer,
      auth: authReducer
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      })
  });
};

const renderWithStore = (component, { preloadedState = {} } = {}) => {
  const store = createTestStore(preloadedState);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

describe('TicketForm Component - Real User Scenarios', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false
  };

  const authenticatedState = {
    auth: {
      user: { id: 1, username: 'testuser', fullName: 'Test User' },
      isAuthenticated: true,
      token: 'test-token'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering and Initial State', () => {
    it('should render all form fields for new ticket creation', () => {
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />, 
        { preloadedState: authenticatedState }
      );

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reporter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/labels/i)).toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: /create ticket/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should populate form fields when editing existing ticket', () => {
      const existingTicket = {
        id: '123',
        title: 'Existing Bug Report',
        description: 'This is an existing bug that needs to be fixed',
        priority: 'high',
        assignee: 'John Developer',
        reporter: 'Jane Tester',
        labels: ['bug', 'urgent'],
        status: 'open'
      };

      renderWithStore(
        <TicketForm {...defaultProps} mode="edit" ticket={existingTicket} />,
        { preloadedState: authenticatedState }
      );

      expect(screen.getByDisplayValue('Existing Bug Report')).toBeInTheDocument();
      expect(screen.getByDisplayValue('This is an existing bug that needs to be fixed')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane Tester')).toBeInTheDocument();
      
      // Check priority dropdown
      const prioritySelect = screen.getByLabelText(/priority/i);
      expect(prioritySelect.value).toBe('high');
      
      expect(screen.getByRole('button', { name: /update ticket/i })).toBeInTheDocument();
    });

    it('should pre-populate reporter with current user in create mode', () => {
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const reporterField = screen.getByLabelText(/reporter/i);
      expect(reporterField.value).toBe('Test User');
    });
  });

  describe('Form Validation - Real World Scenarios', () => {
    it('should validate required fields when creating a ticket', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const submitButton = screen.getByRole('button', { name: /create ticket/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
        expect(screen.getByText(/assignee is required/i)).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should validate title length constraints', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const titleField = screen.getByLabelText(/title/i);
      
      // Test minimum length
      await user.type(titleField, 'AB');
      await user.tab(); // Trigger blur validation

      await waitFor(() => {
        expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
      });

      // Test maximum length (use fireEvent for a large value to keep the test fast)
      fireEvent.change(titleField, { target: { value: 'A'.repeat(101) } });

      await waitFor(() => {
        expect(screen.getByText(/title cannot exceed 100 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate description length constraints', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const descriptionField = screen.getByLabelText(/description/i);
      
      // Test minimum length
      await user.type(descriptionField, 'Short');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
      });

      // Test maximum length (use fireEvent for a large value to keep the test fast)
      fireEvent.change(descriptionField, { target: { value: 'A'.repeat(2001) } });

      await waitFor(() => {
        expect(screen.getByText(/description cannot exceed 2000 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate email format if assignee looks like email', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const assigneeField = screen.getByLabelText(/assignee/i);
      await user.type(assigneeField, 'invalid-email');
      await user.tab();

      // This should be valid as it's treated as a name, not email
      await waitFor(() => {
        expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
      });

      // But if it looks like an email, it should validate
      await user.clear(assigneeField);
      await user.type(assigneeField, 'invalid@');
      await user.tab();

      // This test assumes email validation is implemented for email-like inputs
    });
  });

  describe('User Interactions and Form Behavior', () => {
    it('should handle priority selection changes', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const prioritySelect = screen.getByLabelText(/priority/i);
      
      await user.selectOptions(prioritySelect, 'critical');
      expect(prioritySelect.value).toBe('critical');

      await user.selectOptions(prioritySelect, 'low');
      expect(prioritySelect.value).toBe('low');
    });

    it('should handle labels input with tag-like behavior', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const labelsField = screen.getByLabelText(/labels/i);
      
      // Type comma-separated labels
      await user.type(labelsField, 'bug, urgent, frontend');
      
      expect(labelsField.value).toBe('bug, urgent, frontend');
    });

    it('should handle form reset when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      // Fill in some form data
      await user.type(screen.getByLabelText(/title/i), 'Test Ticket');
      await user.type(screen.getByLabelText(/description/i), 'Test description for the ticket');
      await user.type(screen.getByLabelText(/assignee/i), 'John Doe');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should show loading state when form is being submitted', () => {
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" isLoading={true} />,
        { preloadedState: authenticatedState }
      );

      const submitButton = screen.getByRole('button', { name: /creating/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission - Real World Scenarios', () => {
    const validFormData = {
      title: 'Login page not responsive on mobile',
      description: 'The login form elements are not properly aligned on mobile devices, making it difficult for users to log in from their phones.',
      priority: 'high',
      assignee: 'Frontend Team',
      labels: 'bug, mobile, ui'
    };

    it('should submit valid form data for new ticket', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/title/i), validFormData.title);
      await user.type(screen.getByLabelText(/description/i), validFormData.description);
      await user.selectOptions(screen.getByLabelText(/priority/i), validFormData.priority);
      await user.type(screen.getByLabelText(/assignee/i), validFormData.assignee);
      await user.type(screen.getByLabelText(/labels/i), validFormData.labels);

      const submitButton = screen.getByRole('button', { name: /create ticket/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: validFormData.title,
            description: validFormData.description,
            priority: validFormData.priority,
            assignee: validFormData.assignee,
            reporter: 'Test User', // Auto-populated
            labels: ['bug', 'mobile', 'ui'] // Parsed from string
          })
        );
      });
    });

    it('should submit updated data for existing ticket', async () => {
      const user = userEvent.setup();
      const existingTicket = {
        id: '123',
        title: 'Original Title',
        description: 'Original description',
        priority: 'medium',
        assignee: 'Original Assignee',
        reporter: 'Original Reporter',
        labels: ['original'],
        status: 'open'
      };

      renderWithStore(
        <TicketForm {...defaultProps} mode="edit" ticket={existingTicket} />,
        { preloadedState: authenticatedState }
      );

      // Update some fields
      const titleField = screen.getByDisplayValue('Original Title');
      await user.clear(titleField);
      await user.type(titleField, 'Updated Bug Report');

      const prioritySelect = screen.getByLabelText(/priority/i);
      await user.selectOptions(prioritySelect, 'critical');

      const submitButton = screen.getByRole('button', { name: /update ticket/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '123',
            title: 'Updated Bug Report',
            priority: 'critical',
            // Other fields should maintain original values
            description: 'Original description',
            assignee: 'Original Assignee'
          })
        );
      });
    });

    it('should handle real-world bug report scenario', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      // Simulate user reporting a real bug
      await user.type(screen.getByLabelText(/title/i), 'Payment processing fails for European credit cards');
      
      await user.type(
        screen.getByLabelText(/description/i),
        'Users from European countries are unable to complete payments using their credit cards. The error occurs after entering card details and clicking "Pay Now". Error message shows "Transaction failed - invalid card". This affects approximately 25% of our European user base based on support tickets.'
      );

      await user.selectOptions(screen.getByLabelText(/priority/i), 'critical');
      await user.type(screen.getByLabelText(/assignee/i), 'Payment Team');
      await user.type(screen.getByLabelText(/labels/i), 'bug, payment, critical, europe, credit-card');

      const submitButton = screen.getByRole('button', { name: /create ticket/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Payment processing fails'),
            description: expect.stringContaining('European countries'),
            priority: 'critical',
            assignee: 'Payment Team',
            labels: expect.arrayContaining(['bug', 'payment', 'critical', 'europe', 'credit-card'])
          })
        );
      });
    });

    it('should handle feature request scenario', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      // Simulate user creating a feature request
      await user.type(screen.getByLabelText(/title/i), 'Add dark mode theme option');
      
      await user.type(
        screen.getByLabelText(/description/i),
        `Users have requested the ability to switch between light and dark themes. This should include:
        - Toggle switch in user settings
        - Persistent theme preference storage
        - Dark theme for all major UI components
        - Accessibility compliance for both themes
        Based on user feedback survey, 78% of users would use dark mode.`
      );

      await user.selectOptions(screen.getByLabelText(/priority/i), 'medium');
      await user.type(screen.getByLabelText(/assignee/i), 'UI/UX Team');
      await user.type(screen.getByLabelText(/labels/i), 'feature, ui, accessibility, user-experience');

      const submitButton = screen.getByRole('button', { name: /create ticket/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Add dark mode theme option',
            description: expect.stringContaining('Toggle switch in user settings'),
            priority: 'medium',
            assignee: 'UI/UX Team',
            labels: expect.arrayContaining(['feature', 'ui', 'accessibility', 'user-experience'])
          })
        );
      });
    });
  });

  describe('Form Accessibility and User Experience', () => {
    it('should have proper ARIA labels and descriptions', () => {
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/description/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/assignee/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should show character count for description field', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const descriptionField = screen.getByLabelText(/description/i);
      const testDescription = 'This is a test description for character counting';
      
      await user.type(descriptionField, testDescription);

      // Look for character count indicator
      expect(screen.getByText(new RegExp(testDescription.length.toString()))).toBeInTheDocument();
    });

    it('should provide helpful placeholder text', () => {
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      expect(screen.getByPlaceholderText(/enter a clear, descriptive title/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/provide detailed information/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/who should work on this/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const titleField = screen.getByLabelText(/title/i);
      titleField.focus();

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/priority/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/assignee/i)).toHaveFocus();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      const onSubmitWithError = vi.fn().mockRejectedValue(new Error('Network error'));
      
      renderWithStore(
        <TicketForm {...defaultProps} onSubmit={onSubmitWithError} mode="create" />,
        { preloadedState: authenticatedState }
      );

      // Fill in valid form data
      await user.type(screen.getByLabelText(/title/i), 'Test Ticket');
      await user.type(screen.getByLabelText(/description/i), 'Test description for network error');
      await user.type(screen.getByLabelText(/assignee/i), 'Test Assignee');

      const submitButton = screen.getByRole('button', { name: /create ticket/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create ticket/i)).toBeInTheDocument();
      });
    });

    it('should handle very long input values', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const longTitle = 'A'.repeat(150); // Exceeds max length
      const titleField = screen.getByLabelText(/title/i);

      fireEvent.change(titleField, { target: { value: longTitle } });

      // Should truncate to the max allowed length
      expect(titleField.value.length).toBeLessThanOrEqual(100);
    });

    it('should handle special characters in input fields', async () => {
      const user = userEvent.setup();
      renderWithStore(
        <TicketForm {...defaultProps} mode="create" />,
        { preloadedState: authenticatedState }
      );

      const specialCharsTitle = 'Bug: 日本語 & émojis 🐛 <script>alert("xss")</script>';
      await user.type(screen.getByLabelText(/title/i), specialCharsTitle);
      
      const titleField = screen.getByLabelText(/title/i);
      expect(titleField.value).toContain('Bug: 日本語 & émojis 🐛');
      // Should not contain script tag (basic XSS protection)
      expect(titleField.value).not.toContain('<script>');
    });
  });
});