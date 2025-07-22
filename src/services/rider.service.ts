// src/services/rider.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface RideRequest {
  pickupLocation: string;
  destination: string;
  rideType: 'car' | 'bike' | 'auto';
  when: 'now' | 'schedule';
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

  requestRide(rideData: RideRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/request`, rideData, this.authService.getAuthHttpOptions());
  }

  getCurrentRide(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rides/current`, this.authService.getAuthHttpOptions());
  }

  getRideHistory(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/rides/history?page=${page}&limit=${limit}`, this.authService.getAuthHttpOptions());
  }

  cancelRide(rideId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/${rideId}/cancel`, { reason }, this.authService.getAuthHttpOptions());
  }

  rateDriver(rideId: string, rating: number, comment?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/${rideId}/rate`, { rating, comment }, this.authService.getAuthHttpOptions());
  }
}