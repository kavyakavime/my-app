// src/services/driver.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Driver {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  license_number: string;
  current_location_address: string;
  is_available: boolean;
  is_verified: boolean;
  rating: string;
  total_rides: number;
  total_earnings: string;
  created_at: string;
  make?: string;
  model?: string;
  plate_number?: string;
  vehicle_type?: string;
  color?: string;
  year?: number;
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
  rider_name: string;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  count?: number;
}

export interface RideRequest {
  requestId: string;
  rideId: string;
  pickup: string;
  destination: string;
  rideType: string;
  estimatedFare: number;
  estimatedEta: string;
  rider: {
    name: string;
    phone: string;
  };
  expiresAt: string;
}

export interface CurrentRide {
  rideId: string;
  pickup: string;
  destination: string;
  status: string;
  fare: number;
  otp: string;
  rider: {
    name: string;
    phone: string;
  };
  acceptedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('userToken') || localStorage.getItem('sessionToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getAuthHttpOptions(): { headers: HttpHeaders } {
    return { headers: this.getAuthHeaders() };
  }

  // Get driver profile by email
  getDriverByEmail(email: string): Observable<ApiResponse<Driver>> {
    return this.http.get<ApiResponse<Driver>>(`${this.apiUrl}/driver/email/${email}`);
  }

  // Get driver rides by driver ID
  getDriverRides(driverId: number): Observable<ApiResponse<RideData[]>> {
    return this.http.get<ApiResponse<RideData[]>>(`${this.apiUrl}/driver/${driverId}/rides`);
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/driver/profile`, this.getAuthHttpOptions());
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/driver/profile`, profileData, this.getAuthHttpOptions());
  }

  updateLocation(lat: number, lng: number, address: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/driver/location`, { lat, lng, address }, this.getAuthHttpOptions());
  }

  toggleAvailability(isAvailable: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/driver/availability`, { isAvailable }, this.getAuthHttpOptions());
  }

  getPendingRideRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/driver/ride-requests`, this.getAuthHttpOptions());
  }

  acceptRideRequest(requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/driver/ride-requests/${requestId}/accept`, {}, this.getAuthHttpOptions());
  }

  declineRideRequest(requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/driver/ride-requests/${requestId}/decline`, {}, this.getAuthHttpOptions());
  }

  getCurrentRide(): Observable<any> {
    return this.http.get(`${this.apiUrl}/driver/current-ride`, this.getAuthHttpOptions());
  }

  updateRideStatus(status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/driver/current-ride/status`, { status }, this.getAuthHttpOptions());
  }

  completeRide(finalFare?: number, distanceKm?: number, durationMinutes?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/driver/current-ride/complete`, { 
      finalFare, 
      distanceKm, 
      durationMinutes 
    }, this.getAuthHttpOptions());
  }

  getRideHistory(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/driver/rides/history?page=${page}&limit=${limit}`, this.getAuthHttpOptions());
  }

  getEarnings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/driver/earnings`, this.getAuthHttpOptions());
  }

  getVehicleInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/driver/vehicle`, this.getAuthHttpOptions());
  }

  updateVehicleInfo(vehicleData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/driver/vehicle`, vehicleData, this.getAuthHttpOptions());
  }

  rateRider(rideId: string, rating: number, comment?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/driver/rides/${rideId}/rate`, { rating, comment }, this.getAuthHttpOptions());
  }
}