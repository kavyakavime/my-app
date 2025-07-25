// src/services/currentRideServices.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Type definitions
interface RideLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface RideStatus {
  status: string;
  timestamp?: string;
  location?: RideLocation;
}

interface RideCompletionData {
  finalFare?: number;
  distanceKm?: number;
  durationMinutes?: number;
  endLocation?: RideLocation;
  rating?: number;
  feedback?: string;
}

interface CurrentRideData {
  id: number;
  rider_id: number;
  driver_id?: number;
  pickup_location: string;
  destination: string;
  ride_type: string;
  status: string;
  estimated_fare: string;
  final_fare?: string;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  otp?: string;
  rider?: {
    id: number;
    full_name: string;
    phone_number: string;
  };
  driver?: {
    id: number;
    full_name: string;
    phone_number: string;
    vehicle_type?: string;
    make?: string;
    model?: string;
    plate_number?: string;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface RideRequest {
  pickup_location: string;
  destination: string;
  ride_type: string;
  estimated_fare: number;
  pickup_coordinates?: RideLocation;
  destination_coordinates?: RideLocation;
}

@Injectable({
  providedIn: 'root'
})
export class CurrentRideService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Get auth headers for API requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('sessionToken') || localStorage.getItem('userToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Create a new ride request
   */
  createRideRequest(riderId: number, rideData: RideRequest): Observable<ApiResponse<CurrentRideData>> {
    const headers = this.getAuthHeaders();
    return this.http.post<ApiResponse<CurrentRideData>>(
      `${this.API_URL}/rider/rides/request`,
      { rider_id: riderId, ...rideData },
      { headers }
    );
  }

  /**
   * Get current ride for rider
   */
  getRiderCurrentRide(): Observable<ApiResponse<CurrentRideData>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<CurrentRideData>>(
      `${this.API_URL}/rider/rides/current`,
      { headers }
    );
  }

  /**
   * Get current ride for driver
   */
  getDriverCurrentRide(): Observable<ApiResponse<CurrentRideData>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<CurrentRideData>>(
      `${this.API_URL}/driver/current-ride`,
      { headers }
    );
  }

  /**
   * Accept a ride request (driver)
   */
  acceptRideRequest(requestId: number): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<ApiResponse>(
      `${this.API_URL}/driver/ride-requests/${requestId}/accept`,
      {},
      { headers }
    );
  }

  /**
   * Decline a ride request (driver)
   */
  declineRideRequest(requestId: number): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<ApiResponse>(
      `${this.API_URL}/driver/ride-requests/${requestId}/decline`,
      {},
      { headers }
    );
  }

  /**
   * Update ride status
   */
  updateRideStatus(
    rideId: number, 
    status: string, 
    additionalData?: Partial<RideStatus>
  ): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      status,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    return this.http.put<ApiResponse>(
      `${this.API_URL}/driver/current-ride/status`,
      payload,
      { headers }
    );
  }

  /**
   * Update driver location during ride
   */
  updateDriverLocation(
    rideId: number, 
    lat: number, 
    lng: number, 
    estimatedEta?: string
  ): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      ride_id: rideId,
      lat,
      lng,
      estimated_eta: estimatedEta,
      timestamp: new Date().toISOString()
    };

    return this.http.put<ApiResponse>(
      `${this.API_URL}/driver/current-ride/location`,
      payload,
      { headers }
    );
  }

  /**
   * Cancel current ride
   */
  cancelCurrentRide(
    rideId: number, 
    reason: string, 
    cancelledBy: 'rider' | 'driver'
  ): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      ride_id: rideId,
      reason,
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString()
    };

    const endpoint = cancelledBy === 'rider' 
      ? `${this.API_URL}/rider/rides/current/cancel`
      : `${this.API_URL}/driver/current-ride/cancel`;

    return this.http.post<ApiResponse>(endpoint, payload, { headers });
  }

  /**
   * Complete current ride
   */
  completeCurrentRide(
    rideId: number, 
    completionData?: RideCompletionData
  ): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      ride_id: rideId,
      completed_at: new Date().toISOString(),
      ...completionData
    };

    return this.http.post<ApiResponse>(
      `${this.API_URL}/driver/current-ride/complete`,
      payload,
      { headers }
    );
  }

  /**
   * Get ride history for rider
   */
  getRiderHistory(page: number = 1, limit: number = 10): Observable<ApiResponse<CurrentRideData[]>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<CurrentRideData[]>>(
      `${this.API_URL}/rider/rides/history?page=${page}&limit=${limit}`,
      { headers }
    );
  }

  /**
   * Get ride history for driver
   */
  getDriverHistory(driverId: number): Observable<ApiResponse<CurrentRideData[]>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<CurrentRideData[]>>(
      `${this.API_URL}/driver/${driverId}/rides`,
      { headers }
    );
  }

  /**
   * Rate a ride (rider rates driver)
   */
  rateDriver(rideId: number, rating: number, comment?: string): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      rating,
      comment: comment || '',
      rated_at: new Date().toISOString()
    };

    return this.http.post<ApiResponse>(
      `${this.API_URL}/rider/rides/${rideId}/rate`,
      payload,
      { headers }
    );
  }

  /**
   * Rate a ride (driver rates rider)
   */
  rateRider(rideId: number, rating: number, comment?: string): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      rating,
      comment: comment || '',
      rated_at: new Date().toISOString()
    };

    return this.http.post<ApiResponse>(
      `${this.API_URL}/driver/rides/${rideId}/rate`,
      payload,
      { headers }
    );
  }

  /**
   * Get pending ride requests for driver
   */
  getPendingRideRequests(): Observable<ApiResponse<any[]>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/driver/ride-requests`,
      { headers }
    );
  }

  /**
   * Update driver availability
   */
  updateDriverAvailability(isAvailable: boolean): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<ApiResponse>(
      `${this.API_URL}/driver/availability`,
      { isAvailable },
      { headers }
    );
  }

  /**
   * Emergency alert
   */
  sendEmergencyAlert(rideId: number, location?: RideLocation): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      ride_id: rideId,
      emergency_type: 'general',
      location,
      timestamp: new Date().toISOString()
    };

    return this.http.post<ApiResponse>(
      `${this.API_URL}/emergency/alert`,
      payload,
      { headers }
    );
  }

  /**
   * Get ride tracking information
   */
  getRideTracking(rideId: number): Observable<ApiResponse<any>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<any>>(
      `${this.API_URL}/rides/${rideId}/tracking`,
      { headers }
    );
  }

  /**
   * Send message between rider and driver
   */
  sendMessage(rideId: number, message: string, senderType: 'rider' | 'driver'): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = {
      ride_id: rideId,
      message,
      sender_type: senderType,
      timestamp: new Date().toISOString()
    };

    return this.http.post<ApiResponse>(
      `${this.API_URL}/rides/${rideId}/messages`,
      payload,
      { headers }
    );
  }

  /**
   * Get messages for a ride
   */
  getRideMessages(rideId: number): Observable<ApiResponse<any[]>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/rides/${rideId}/messages`,
      { headers }
    );
  }

  /**
   * Calculate estimated fare
   */
  calculateFare(
    pickupCoords: RideLocation, 
    destinationCoords: RideLocation, 
    rideType: string
  ): Observable<ApiResponse<{ estimatedFare: number; distance: number; duration: number }>> {
    const headers = this.getAuthHeaders();
    const payload = {
      pickup: pickupCoords,
      destination: destinationCoords,
      ride_type: rideType
    };

    return this.http.post<ApiResponse<{ estimatedFare: number; distance: number; duration: number }>>(
      `${this.API_URL}/rides/calculate-fare`,
      payload,
      { headers }
    );
  }

  /**
   * Get nearby drivers
   */
  getNearbyDrivers(location: RideLocation, rideType: string): Observable<ApiResponse<any[]>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/drivers/nearby?lat=${location.lat}&lng=${location.lng}&type=${rideType}`,
      { headers }
    );
  }

  /**
   * Update ride preferences
   */
  updateRidePreferences(preferences: any): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<ApiResponse>(
      `${this.API_URL}/rider/preferences`,
      preferences,
      { headers }
    );
  }

  /**
   * Get driver earnings
   */
  getDriverEarnings(): Observable<ApiResponse<any>> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<any>>(
      `${this.API_URL}/driver/earnings`,
      { headers }
    );
  }

  /**
   * Update driver location (general)
   */
  updateDriverGeneralLocation(lat: number, lng: number, address: string): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const payload = { lat, lng, address };
    
    return this.http.put<ApiResponse>(
      `${this.API_URL}/driver/location`,
      payload,
      { headers }
    );
  }
}