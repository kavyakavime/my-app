// src/services/rider.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RideRequest {
  pickupLocation: string;
  destination: string;
  rideType: 'car' | 'bike' | 'auto';
  when: 'now' | 'schedule';
}

export interface RiderData {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_payment_method?: string;
  created_at: string;
  is_verified: number;
  is_active: number;
}

export interface RideData {
  id: number;
  ride_id: string;
  pickup_location: string;
  destination: string;
  ride_type: string;
  status: string;
  estimated_fare: string;
  final_fare?: string;
  created_at: string;
  completed_at?: string;
  driver_name?: string;
  make?: string;
  model?: string;
  plate_number?: string;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  count?: number;
}

export interface RideHistory {
  rideId: string;
  pickup: string;
  destination: string;
  status: string;
  fare: number;
  date: string;
  driver?: {
    name: string;
    vehicle: string;
    plateNumber: string;
  };
  rating?: number;
  comment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RiderService {
  private apiUrl = 'http://localhost:3000/api/rider';

  constructor(private http: HttpClient) {}

  /**
   * Get rider profile by email
   */
  getRiderByEmail(email: string): Observable<ApiResponse<RiderData>> {
    return this.http.get<ApiResponse<RiderData>>(`${this.apiUrl}/email/${email}`);
  }

  /**
   * Get rider profile by ID
   */
  getRiderById(riderId: number): Observable<ApiResponse<RiderData>> {
    return this.http.get<ApiResponse<RiderData>>(`${this.apiUrl}/id/${riderId}`);
  }

  /**
   * Get all riders (for admin/testing purposes)
   */
  getAllRiders(): Observable<ApiResponse<RiderData[]>> {
    return this.http.get<ApiResponse<RiderData[]>>(`${this.apiUrl}/all`);
  }

  /**
   * Get rides for a specific rider
   */
  getRiderRides(riderId: number): Observable<ApiResponse<RideData[]>> {
    return this.http.get<ApiResponse<RideData[]>>(`${this.apiUrl}/${riderId}/rides`);
  }

  /**
   * Get rider profile (authenticated)
   */
  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`);
  }

  /**
   * Update rider profile (authenticated)
   */
  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, profileData);
  }

  /**
   * Request a ride (authenticated)
   */
  requestRide(rideData: RideRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/request`, rideData);
  }

  /**
   * Get current ride (authenticated)
   */
  getCurrentRide(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rides/current`);
  }

  /**
   * Get ride history (authenticated)
   */
  getRideHistory(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/rides/history?page=${page}&limit=${limit}`);
  }

  /**
   * Cancel a ride (authenticated)
   */
  cancelRide(rideId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/${rideId}/cancel`, { reason });
  }

  /**
   * Rate a driver (authenticated)
   */
  rateDriver(rideId: string, rating: number, comment?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/${rideId}/rate`, { rating, comment });
  }

  /**
   * Map API ride data to RideHistory format
   */
  mapRideDataToHistory(rides: RideData[]): RideHistory[] {
    return rides.map(ride => ({
      rideId: ride.ride_id,
      pickup: ride.pickup_location,
      destination: ride.destination,
      status: ride.status,
      fare: parseFloat(ride.final_fare || ride.estimated_fare) || 0,
      date: ride.completed_at || ride.created_at,
      driver: ride.driver_name ? {
        name: ride.driver_name,
        vehicle: ride.make && ride.model ? `${ride.make} ${ride.model}` : 'Vehicle',
        plateNumber: ride.plate_number || 'N/A'
      } : undefined
    }));
  }

  /**
   * Filter rides by status
   */
  filterRidesByStatus(rides: RideData[], status: string | string[]): RideData[] {
    const statusArray = Array.isArray(status) ? status : [status];
    return rides.filter(ride => statusArray.includes(ride.status));
  }

  /**
   * Get active rides (rides that are not completed or cancelled)
   */
  getActiveRides(rides: RideData[]): RideData[] {
    return this.filterRidesByStatus(rides, ['requested', 'accepted', 'driver_on_way', 'rider_picked_up']);
  }

  /**
   * Get completed rides
   */
  getCompletedRides(rides: RideData[]): RideData[] {
    return this.filterRidesByStatus(rides, ['completed', 'cancelled']);
  }

  /**
   * Calculate total spent by rider
   */
  calculateTotalSpent(rides: RideData[]): number {
    return rides
      .filter(ride => ride.status === 'completed')
      .reduce((total, ride) => total + (parseFloat(ride.final_fare || ride.estimated_fare) || 0), 0);
  }

  /**
   * Get ride statistics for a rider
   */
  getRideStatistics(rides: RideData[]): {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalSpent: number;
    averageFare: number;
  } {
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const cancelledRides = rides.filter(ride => ride.status === 'cancelled');
    const totalSpent = this.calculateTotalSpent(rides);
    
    return {
      totalRides: rides.length,
      completedRides: completedRides.length,
      cancelledRides: cancelledRides.length,
      totalSpent: totalSpent,
      averageFare: completedRides.length > 0 ? totalSpent / completedRides.length : 0
    };
  }

  /**
   * Format ride duration
   */
  formatRideDuration(startTime: string, endTime?: string): string {
    if (!endTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} mins`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Get status display text
   */
  getStatusDisplayText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'requested': 'Looking for Driver',
      'accepted': 'Driver Assigned',
      'driver_on_way': 'Driver On The Way',
      'rider_picked_up': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  /**
   * Check if a ride can be cancelled
   */
  canCancelRide(status: string): boolean {
    return ['requested', 'accepted', 'driver_on_way'].includes(status);
  }

  /**
   * Check if a ride can be rated
   */
  canRateRide(status: string, hasRating: boolean = false): boolean {
    return status === 'completed' && !hasRating;
  }

  /**
   * Get ride type display text
   */
  getRideTypeDisplayText(rideType: string): string {
    const typeMap: { [key: string]: string } = {
      'car': 'Car',
      'bike': 'Bike',
      'auto': 'Auto Rickshaw'
    };
    return typeMap[rideType] || rideType;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get time ago text
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return this.formatDate(dateString);
  }

  /**
   * Validate ride request data
   */
  validateRideRequest(rideData: RideRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rideData.pickupLocation || rideData.pickupLocation.trim().length === 0) {
      errors.push('Pickup location is required');
    }
    
    if (!rideData.destination || rideData.destination.trim().length === 0) {
      errors.push('Destination is required');
    }
    
    if (!rideData.rideType || !['car', 'bike', 'auto'].includes(rideData.rideType)) {
      errors.push('Valid ride type is required');
    }
    
    if (!rideData.when || !['now', 'schedule'].includes(rideData.when)) {
      errors.push('Valid timing option is required');
    }
    
    if (rideData.pickupLocation === rideData.destination) {
      errors.push('Pickup and destination cannot be the same');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}