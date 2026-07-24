/**
 * Integration tests for the Dashboard page.
 * The Dashboard is a KPI/overview page that loads its data via Redux thunks
 * (KPI metrics, priority breakdown, assigned tickets, recently updated tickets).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../../pages/Dashboard/Dashboard';
import ticketsReducer from '../../store/slices/ticketsSlice';
import authReducer from '../../store/slices/authSlice';
import dashboardReducer from '../../store/slices/dashboardSlice';

// Mock the API service layer used by the dashboard thunks
vi.mock('../../services/api', () => ({
  ticketService: {
    getTickets: vi.fn()
  },
  dashboardService: {
    getDashboardStats: vi.fn(),
    getUserDashboard: vi.fn()
  }
}));

import { ticketService, dashboardService } from '../../services/api';

const kpiStats = {
  totalTickets: 156,
  openTickets: 45,
  inProgressTickets: 32,
  resolvedTickets: 67,
  closedTickets: 12,
  priorityBreakdown: {
    critical: 8,
    high: 23,
    medium: 89,
    low: 36
  }
};

const assignedTickets = [
  {
    id: '1',
    title: 'Critical production bug in payment gateway',
    status: 'open',
    priority: 'high',
    updatedDate: '2026-07-24T14:30:00Z'
  }
];

const recentTickets = [
  {
    id: '2',
    title: 'Implement dark mode theme',
    status: 'in_progress',
    reporter: 'Product Manager',
    updatedDate: '2026-07-24T11:45:00Z'
  }
];

const authState = {
  auth: {
    user: { id: 1, username: 'testuser', fullName: 'Test User' },
    isAuthenticated: true,
    token: 'test-token'
  }
};

const createTestStore = (preloadedState = {}) =>
  configureStore({
    reducer: {
      tickets: ticketsReducer,
      auth: authReducer,
      dashboard: dashboardReducer
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false })
  });

const renderDashboard = (preloadedState = authState) => {
  const store = createTestStore(preloadedState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>
    )
  };
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dashboardService.getDashboardStats.mockResolvedValue({
      data: { data: kpiStats }
    });
    dashboardService.getUserDashboard.mockResolvedValue({
      data: { data: { recentActivity: assignedTickets } }
    });
    ticketService.getTickets.mockResolvedValue({
      data: { data: { tickets: recentTickets } }
    });
  });

  describe('KPI metrics', () => {
    it('should render all KPI metric cards with their values', async () => {
      renderDashboard();

      expect(await screen.findByText('156')).toBeInTheDocument();
      expect(screen.getByText('Total Tickets')).toBeInTheDocument();

      expect(screen.getByText('Open Tickets')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();

      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('32')).toBeInTheDocument();

      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('67')).toBeInTheDocument();

      expect(screen.getByText('Closed')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display the priority breakdown counts', async () => {
      renderDashboard();

      expect(await screen.findByText('8')).toBeInTheDocument();   // critical
      expect(screen.getByText('23')).toBeInTheDocument();          // high
      expect(screen.getByText('89')).toBeInTheDocument();          // medium
      expect(screen.getByText('36')).toBeInTheDocument();          // low

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('Ticket overview lists', () => {
    it('should render assigned tickets with a link to their detail page', async () => {
      renderDashboard();

      const assignedLink = await screen.findByText('Critical production bug in payment gateway');
      expect(assignedLink.closest('a')).toHaveAttribute('href', '/tickets/1');
    });

    it('should render the recently updated tickets section', async () => {
      renderDashboard();

      const recentLink = await screen.findByText('Implement dark mode theme');
      expect(recentLink.closest('a')).toHaveAttribute('href', '/tickets/2');
      expect(screen.getByText('Recently Updated')).toBeInTheDocument();
    });

    it('should show empty-state messages when there are no tickets', async () => {
      dashboardService.getUserDashboard.mockResolvedValue({
        data: { data: { recentActivity: [] } }
      });
      ticketService.getTickets.mockResolvedValue({
        data: { data: { tickets: [] } }
      });

      renderDashboard();

      expect(await screen.findByText(/no tickets assigned to you/i)).toBeInTheDocument();
      expect(screen.getByText(/no recent ticket updates/i)).toBeInTheDocument();
    });
  });

  describe('Loading and error states', () => {
    it('should show a loading indicator while data is being fetched', () => {
      // Never-resolving promise keeps the dashboard in its loading state
      dashboardService.getDashboardStats.mockReturnValue(new Promise(() => {}));

      renderDashboard();

      expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    });

    it('should show an error message when data fails to load', async () => {
      dashboardService.getDashboardStats.mockRejectedValue(new Error('boom'));

      renderDashboard();

      expect(await screen.findByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });
});
