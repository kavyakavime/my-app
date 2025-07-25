import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';

interface DriverStats {
  rating: number;
  totalRides: number;
  monthlyEarnings: number;
}

interface RideHistory {
  rideId: string;
  pickup: string;
  destination: string;
  date: string;
  riderName: string;
  duration: string;
  fare: number;
  rating: number;
  status: string;
}

interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface Driver {
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

interface RideData {
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

interface RideRequest {
  id: number;
  rider_id: number;
  pickup_location: string;
  destination: string;
  ride_type: string;
  estimated_fare: string;
  created_at: string;
  rider: {
    id: number;
    full_name: string;
    phone_number: string;
  };
}

interface CurrentRide {
  id: number;
  rider_id: number;
  driver_id: number;
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
  rider: {
    id: number;
    full_name: string;
    phone_number: string;
  };
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  count?: number;
  success?: boolean;
  requests?: T;
  currentRide?: T;
  earnings?: T;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule], 
  templateUrl: './driverDashboard.component.html',
  styleUrls: ['./driverDashboard.component.scss']
})
export class DriverDashboardComponent implements OnInit, OnDestroy {
  activeTab: 'requests' | 'current' | 'history' | 'profile' = 'requests';
  isAvailable = true;
  isProcessing = false;
  isLoading = true;
  errorMessage = '';
  
  profileForm: FormGroup;
  vehicleForm: FormGroup;

  // Data
  currentDriver: Driver | null = null;
  driverStats: DriverStats = {
    rating: 0,
    totalRides: 0,
    monthlyEarnings: 0
  };

  pendingRequests: RideRequest[] = [];
  currentRide: CurrentRide | null = null;
  rideHistory: RideHistory[] = [];
  
  earningsSummary: EarningsSummary = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  };

  private subscriptions: Subscription[] = [];
  private pollingSubscription: Subscription | null = null;
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.profileForm = this.formBuilder.group({
      fullName: [{ value: '', disabled: true }],
      currentLocation: ['', Validators.required]
    });

    this.vehicleForm = this.formBuilder.group({
      vehicleType: [{ value: '', disabled: true }],
      vehicleModel: [{ value: '', disabled: true }],
      numberPlate: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadDriverData();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

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
   * Load driver data from backend
   */
  private loadDriverData(): void {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      this.router.navigate(['/sign-in']);
      return;
    }

    this.isLoading = true;
    
    const driverSub = this.http.get<ApiResponse<Driver>>(`${this.API_URL}/driver/email/${userEmail}`).subscribe({
      next: (response) => {
        if (response.data) {
          this.currentDriver = response.data;
          this.isAvailable = !!response.data.is_available;
          this.updateDriverStats();
          this.initializeForms();
          this.loadDriverRides();
          this.loadCurrentRide();
          this.loadEarnings();
          this.loadPendingRequests();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading driver data:', error);
        this.errorMessage = 'Failed to load driver data';
        this.isLoading = false;
      }
    });

    this.subscriptions.push(driverSub);
  }

  /**
   * Update driver stats from loaded data
   */
  private updateDriverStats(): void {
    if (this.currentDriver) {
      this.driverStats = {
        rating: parseFloat(this.currentDriver.rating) || 0,
        totalRides: this.currentDriver.total_rides || 0,
        monthlyEarnings: parseFloat(this.currentDriver.total_earnings) || 0
      };
    }
  }

  /**
   * Load driver rides from backend
   */
  private loadDriverRides(): void {
    if (!this.currentDriver) return;

    const ridesSub = this.http.get<ApiResponse<RideData[]>>(`${this.API_URL}/driver/${this.currentDriver.id}/rides`).subscribe({
      next: (response) => {
        if (response.data) {
          this.rideHistory = response.data.map(ride => ({
            rideId: ride.ride_id,
            pickup: ride.pickup_location,
            destination: ride.destination,
            date: ride.completed_at || ride.created_at,
            riderName: ride.rider_name,
            duration: this.calculateDuration(ride.created_at, ride.completed_at),
            fare: parseFloat(ride.final_fare || ride.estimated_fare) || 0,
            rating: 5, // Default rating - you might want to fetch actual ratings
            status: ride.status
          }));
        }
      },
      error: (error) => {
        console.error('Error loading driver rides:', error);
      }
    });

    this.subscriptions.push(ridesSub);
  }

  /**
   * Load current ride from backend
   */
  private loadCurrentRide(): void {
    const headers = this.getAuthHeaders();
    const currentRideSub = this.http.get<ApiResponse<CurrentRide>>(
      `${this.API_URL}/driver/current-ride`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.currentRide = response.currentRide || response.data || null;
        if (this.currentRide) {
          this.setActiveTab('current');
        }
      },
      error: (error) => {
        console.error('Error loading current ride:', error);
        this.currentRide = null;
      }
    });

    this.subscriptions.push(currentRideSub);
  }

  /**
   * Load earnings from backend
   */
  private loadEarnings(): void {
    const headers = this.getAuthHeaders();
    const earningsSub = this.http.get<ApiResponse<EarningsSummary>>(
      `${this.API_URL}/driver/earnings`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.earnings || response.data) {
          const earnings = response.earnings || response.data;
          this.earningsSummary = {
            today: earnings?.today || 0,
            thisWeek: earnings?.thisWeek || 0,
            thisMonth: earnings?.thisMonth || 0
          };
        }
      },
      error: (error) => {
        console.error('Error loading earnings:', error);
      }
    });

    this.subscriptions.push(earningsSub);
  }

  /**
   * Load pending ride requests
   */
  loadPendingRequests(): void {
    const headers = this.getAuthHeaders();
    const requestsSub = this.http.get<ApiResponse<RideRequest[]>>(
      `${this.API_URL}/driver/ride-requests`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.pendingRequests = response.requests || response.data || [];
      },
      error: (error) => {
        console.error('Error loading pending requests:', error);
        this.pendingRequests = [];
      }
    });

    this.subscriptions.push(requestsSub);
  }

  /**
   * Start polling for updates
   */
  private startPolling(): void {
    // Poll every 10 seconds for pending requests and current ride updates
    this.pollingSubscription = interval(10000).subscribe(() => {
      if (this.isAvailable && this.activeTab === 'requests') {
        this.loadPendingRequests();
      }
      if (this.activeTab === 'current') {
        this.loadCurrentRide();
      }
    });
  }

  /**
   * Initialize forms with driver data
   */
  private initializeForms(): void {
    if (this.currentDriver) {
      this.profileForm.patchValue({
        fullName: this.currentDriver.full_name,
        currentLocation: this.currentDriver.current_location_address || ''
      });

      this.vehicleForm.patchValue({
        vehicleType: this.currentDriver.vehicle_type || 'Car',
        vehicleModel: `${this.currentDriver.make || ''} ${this.currentDriver.model || ''}`.trim(),
        numberPlate: this.currentDriver.plate_number || ''
      });
    }
  }

  /**
   * Calculate duration between two dates
   */
  private calculateDuration(startDate: string, endDate?: string): string {
    if (!endDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    return `${diffMins} mins`;
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'requests' | 'current' | 'history' | 'profile'): void {
    this.activeTab = tab;
    
    // Load data based on active tab
    if (tab === 'requests') {
      this.loadPendingRequests();
    } else if (tab === 'current') {
      this.loadCurrentRide();
    } else if (tab === 'history') {
      this.loadDriverRides();
    }
  }

  /**
   * Toggle driver availability
   */
  toggleAvailability(): void {
    const headers = this.getAuthHeaders();
    const toggleSub = this.http.put<ApiResponse<any>>(
      `${this.API_URL}/driver/availability`,
      { isAvailable: this.isAvailable },
      { headers }
    ).subscribe({
      next: (response) => {
        console.log('Availability updated:', response.message);
        if (!this.isAvailable) {
          this.pendingRequests = [];
        } else {
          this.loadPendingRequests();
        }
      },
      error: (error) => {
        console.error('Error updating availability:', error);
        // Revert the toggle on error
        this.isAvailable = !this.isAvailable;
      }
    });

    this.subscriptions.push(toggleSub);
  }

  /**
   * Accept ride request
   */
  acceptRequest(request: RideRequest): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const headers = this.getAuthHeaders();
    
    const acceptSub = this.http.post<ApiResponse<any>>(
      `${this.API_URL}/driver/ride-requests/${request.id}/accept`,
      {},
      { headers }
    ).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.pendingRequests = this.pendingRequests.filter(req => req.id !== request.id);
          this.loadCurrentRide();
          this.setActiveTab('current');
          alert('Ride request accepted successfully!');
        } else {
          alert(response.message || 'Failed to accept ride request.');
        }
      },
      error: (error) => {
        this.isProcessing = false;
        console.error('Error accepting ride request:', error);
        alert('Failed to accept ride request. Please try again.');
      }
    });

    this.subscriptions.push(acceptSub);
  }

  /**
   * Decline ride request
   */
  declineRequest(request: RideRequest): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const headers = this.getAuthHeaders();
    
    const declineSub = this.http.post<ApiResponse<any>>(
      `${this.API_URL}/driver/ride-requests/${request.id}/decline`,
      {},
      { headers }
    ).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.pendingRequests = this.pendingRequests.filter(req => req.id !== request.id);
          alert('Ride request declined.');
        } else {
          alert(response.message || 'Failed to decline ride request.');
        }
      },
      error: (error) => {
        this.isProcessing = false;
        console.error('Error declining ride request:', error);
        alert('Failed to decline ride request.');
      }
    });

    this.subscriptions.push(declineSub);
  }

  /**
   * Complete current ride
   */
  completeRide(): void {
    if (!this.currentRide) return;

    const confirmComplete = confirm('Are you sure you want to complete this ride?');
    if (!confirmComplete) return;

    const headers = this.getAuthHeaders();
    const completeSub = this.http.post<ApiResponse<any>>(
      `${this.API_URL}/driver/current-ride/complete`,
      {},
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.currentRide = null;
          this.loadDriverRides();
          this.loadEarnings();
          this.loadDriverData(); // Reload to update stats
          alert('Ride completed successfully!');
          this.setActiveTab('history');
        } else {
          alert(response.message || 'Failed to complete ride.');
        }
      },
      error: (error) => {
        console.error('Error completing ride:', error);
        alert('Failed to complete ride. Please try again.');
      }
    });

    this.subscriptions.push(completeSub);
  }

  /**
   * Update ride status
   */
  updateRideStatus(status: string): void {
    const headers = this.getAuthHeaders();
    const updateSub = this.http.put<ApiResponse<any>>(
      `${this.API_URL}/driver/current-ride/status`,
      { status },
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCurrentRide();
          alert('Ride status updated successfully!');
        } else {
          alert(response.message || 'Failed to update ride status.');
        }
      },
      error: (error) => {
        console.error('Error updating ride status:', error);
        alert('Failed to update ride status.');
      }
    });

    this.subscriptions.push(updateSub);
  }

  /**
   * Call rider
   */
  callRider(): void {
    if (this.currentRide && this.currentRide.rider) {
      alert(`Calling ${this.currentRide.rider.full_name} at ${this.currentRide.rider.phone_number}...`);
      // In a real app, this would initiate a phone call
    }
  }

  /**
   * Message rider
   */
  messageRider(): void {
    if (this.currentRide && this.currentRide.rider) {
      alert(`Opening chat with ${this.currentRide.rider.full_name}...`);
      // In a real app, this would open a messaging interface
    }
  }

  /**
   * Start navigation
   */
  startNavigation(): void {
    if (this.currentRide) {
      alert(`Starting navigation to ${this.currentRide.destination}...`);
      // In a real app, this would integrate with maps
    }
  }

  /**
   * Emergency action
   */
  emergency(): void {
    alert('Emergency services contacted. Stay safe!');
    // Here you would implement emergency functionality
  }

  /**
   * View ride details
   */
  viewRideDetails(ride: RideHistory): void {
    alert(`Viewing details for ride ${ride.rideId}`);
    // Here you would navigate to a detailed view or open a modal
  }

  /**
   * Update location
   */
  updateLocation(): void {
    const newLocation = this.profileForm.get('currentLocation')?.value;
    if (!newLocation || !newLocation.trim()) {
      alert('Please enter a valid location.');
      return;
    }

    const headers = this.getAuthHeaders();
    const updateSub = this.http.put<ApiResponse<any>>(
      `${this.API_URL}/driver/location`,
      { lat: 0, lng: 0, address: newLocation },
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Location updated successfully!');
          if (this.currentDriver) {
            this.currentDriver.current_location_address = newLocation;
          }
        } else {
          alert(response.message || 'Failed to update location.');
        }
      },
      error: (error) => {
        console.error('Error updating location:', error);
        alert('Failed to update location. Please try again.');
      }
    });

    this.subscriptions.push(updateSub);
  }

  /**
   * View detailed earnings report
   */
  viewDetailedReport(): void {
    alert('Opening detailed earnings report...');
    // Here you would navigate to detailed earnings page
  }

  /**
   * Logout driver
   */
  logout(): void {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      // Clear any stored data
      localStorage.removeItem('userToken');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userType');
      
      // Navigate to login page
      this.router.navigate(['/register']);
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get status display text
   */
  getStatusDisplayText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'requested': 'Requested',
      'accepted': 'Accepted',
      'driver_on_way': 'On The Way',
      'rider_picked_up': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  /**
   * Check if driver has pending requests
   */
  get hasPendingRequests(): boolean {
    return this.pendingRequests.length > 0;
  }

  /**
   * Check if driver has current ride
   */
  get hasCurrentRide(): boolean {
    return this.currentRide !== null;
  }

  /**
   * Check if driver has ride history
   */
  get hasRideHistory(): boolean {
    return this.rideHistory.length > 0;
  }

  /**
   * Get current location from form
   */
  get currentLocation(): string {
    return this.profileForm.get('currentLocation')?.value || '';
  }

  /**
   * Get availability status text
   */
  get availabilityStatus(): string {
    return this.isAvailable ? 'Available' : 'Offline';
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = '';
  }
}