// Mock sales state management (frontend-only)

import { Sale } from "@/types";

// In-memory storage for mock sales
let mockSales: Sale[] = [];

/**
 * Add a new sale to mock storage
 */
export function addMockSale(sale: Sale): void {
  mockSales.push(sale);
}

/**
 * Get all mock sales
 */
export function getMockSales(): Sale[] {
  return [...mockSales];
}

/**
 * Get sales by track ID
 */
export function getMockSalesByTrack(trackId: string): Sale[] {
  return mockSales.filter((sale) => sale.trackId === trackId);
}

/**
 * Get sales by buyer address
 */
export function getMockSalesByBuyer(buyerAddress: string): Sale[] {
  return mockSales.filter((sale) => sale.buyerAddress === buyerAddress);
}

/**
 * Clear all mock sales (useful for testing)
 */
export function clearMockSales(): void {
  mockSales = [];
}











