import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { DriverService, Driver, RideData, RideRequest, CurrentRide } from '../services/driver.service';

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private driverService: DriverService
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
   * Load driver data from backend
   */
  private loadDriverData(): void {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      this.router.navigate(['/sign-in']);
      return;
    }

    this.isLoading = true;
    
    const driverSub = this.driverService.getDriverByEmail(userEmail).subscribe({
      next: (response) => {
        if (response.data) {
          this.currentDriver = response.data;
          this.isAvailable = !!response.data.is_available;
          this.updateDriverStats();
          this.initializeForms();
          this.loadDriverRides();
          this.loadCurrentRide();
          this.loadEarnings();
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
    alert("IN driverSUB");
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

    const ridesSub = this.driverService.getDriverRides(this.currentDriver.id).subscribe({
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
    const currentRideSub = this.driverService.getCurrentRide().subscribe({
      next: (response) => {
        this.currentRide = response.currentRide || null;
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
    const earningsSub = this.driverService.getEarnings().subscribe({
      next: (response) => {
        if (response.earnings) {
          this.earningsSummary = {
            today: response.earnings.today || 0,
            thisWeek: response.earnings.thisWeek || 0,
            thisMonth: response.earnings.thisMonth || 0
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
   * Load pending ride requests. moved from private.
   */
  loadPendingRequests(): void {
    const requestsSub = this.driverService.getPendingRideRequests().subscribe({
      next: (response) => {
        this.pendingRequests = response.requests || [];
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
    // Poll every 30 seconds for pending requests and current ride
    this.pollingSubscription = interval(30000).subscribe(() => {
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
    const toggleSub = this.driverService.toggleAvailability(this.isAvailable).subscribe({
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
    
    const acceptSub = this.driverService.acceptRideRequest(request.requestId).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.pendingRequests = this.pendingRequests.filter(req => req.requestId !== request.requestId);
        this.loadCurrentRide();
        this.setActiveTab('current');
        alert('Ride request accepted successfully!');
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
    
    const declineSub = this.driverService.declineRideRequest(request.requestId).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.pendingRequests = this.pendingRequests.filter(req => req.requestId !== request.requestId);
        alert('Ride request declined.');
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
    if (confirmComplete) {
      const completeSub = this.driverService.completeRide().subscribe({
        next: (response) => {
          this.currentRide = null;
          this.loadDriverRides();
          this.loadEarnings();
          this.loadDriverData(); // Reload to update stats
          alert('Ride completed successfully!');
        },
        error: (error) => {
          console.error('Error completing ride:', error);
          alert('Failed to complete ride. Please try again.');
        }
      });

      this.subscriptions.push(completeSub);
    }
  }

  /**
   * Update ride status
   */
  updateRideStatus(status: string): void {
    const updateSub = this.driverService.updateRideStatus(status).subscribe({
      next: (response) => {
        this.loadCurrentRide();
        alert('Ride status updated successfully!');
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
    if (this.currentRide) {
      alert(`Calling ${this.currentRide.rider.name}...`);
      // In a real app, this would initiate a phone call
    }
  }

  /**
   * Message rider
   */
  messageRider(): void {
    if (this.currentRide) {
      alert(`Opening chat with ${this.currentRide.rider.name}...`);
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
    if (newLocation && newLocation.trim()) {
      const updateSub = this.driverService.updateLocation(0, 0, newLocation).subscribe({
        next: (response) => {
          alert('Location updated successfully!');
          if (this.currentDriver) {
            this.currentDriver.current_location_address = newLocation;
          }
        },
        error: (error) => {
          console.error('Error updating location:', error);
          alert('Failed to update location. Please try again.');
        }
      });

      this.subscriptions.push(updateSub);
    } else {
      alert('Please enter a valid location.');
    }
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