// src/services/driver.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

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

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private apiUrl = 'http://localhost:3000/api/driver';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`, this.authService.getAuthHttpOptions());
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, profileData, this.authService.getAuthHttpOptions());
  }

  updateLocation(lat: number, lng: number, address: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/location`, { lat, lng, address }, this.authService.getAuthHttpOptions());
  }

  toggleAvailability(isAvailable: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/availability`, { isAvailable }, this.authService.getAuthHttpOptions());
  }

  getPendingRideRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ride-requests`, this.authService.getAuthHttpOptions());
  }

  acceptRideRequest(requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ride-requests/${requestId}/accept`, {}, this.authService.getAuthHttpOptions());
  }

  declineRideRequest(requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ride-requests/${requestId}/decline`, {}, this.authService.getAuthHttpOptions());
  }

  getCurrentRide(): Observable<any> {
    return this.http.get(`${this.apiUrl}/current-ride`, this.authService.getAuthHttpOptions());
  }

  updateRideStatus(status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/current-ride/status`, { status }, this.authService.getAuthHttpOptions());
  }

  completeRide(finalFare?: number, distanceKm?: number, durationMinutes?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/current-ride/complete`, { 
      finalFare, 
      distanceKm, 
      durationMinutes 
    }, this.authService.getAuthHttpOptions());
  }

  getRideHistory(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/rides/history?page=${page}&limit=${limit}`, this.authService.getAuthHttpOptions());
  }

  getEarnings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/earnings`, this.authService.getAuthHttpOptions());
  }

  getVehicleInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/vehicle`, this.authService.getAuthHttpOptions());
  }

  updateVehicleInfo(vehicleData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/vehicle`, vehicleData, this.authService.getAuthHttpOptions());
  }

  rateRider(rideId: string, rating: number, comment?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/${rideId}/rate`, { rating, comment }, this.authService.getAuthHttpOptions());
  }
}