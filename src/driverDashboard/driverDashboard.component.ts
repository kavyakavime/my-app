import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';


interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface DriverStats {
  rating: number;
  totalRides: number;
  monthlyEarnings: number;
}

interface RideRequest {
  id: string;
  riderName: string;
  pickup: string;
  destination: string;
  distance: string;
  eta: string;
  fare: number;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
}

interface CurrentRide {
  rideId: string;
  rider: Rider;
  pickup: string;
  destination: string;
  fare: number;
  status: string;
  otp: string;
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
}

interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
  templateUrl: './driverDashboard.component.html',
  styleUrls: ['./driverDashboard.component.scss']
})
export class DriverDashboardComponent implements OnInit {
  activeTab: 'requests' | 'current' | 'history' | 'profile' = 'requests';
  isAvailable = true;
  isProcessing = false;
  
  profileForm: FormGroup;
  vehicleForm: FormGroup;

  // Data
  currentDriver: Driver = {
    id: 'driver1',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 98765 43210'
  };

  driverStats: DriverStats = {
    rating: 4.8,
    totalRides: 1247,
    monthlyEarnings: 2346
  };

  pendingRequests: RideRequest[] = [];
  currentRide: CurrentRide | null = null;
  rideHistory: RideHistory[] = [];
  
  earningsSummary: EarningsSummary = {
    today: 128,
    thisWeek: 845,
    thisMonth: 2346
  };

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
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
    this.loadMockData();
    this.loadCurrentRide();
    this.loadRideHistory();
    this.initializeForms();
  }

  /**
   * mock data
   */
  private loadMockData(): void {
    this.pendingRequests = [
      {
        id: 'req1',
        riderName: 'Alex Smith',
        pickup: 'Bandra West',
        destination: 'Andheri East',
        distance: '8.5 km',
        eta: '12 mins',
        fare: 18
      },
      {
        id: 'req2',
        riderName: 'Priya Sharma',
        pickup: 'Powai',
        destination: 'BKC',
        distance: '6.2 km',
        eta: '8 mins',
        fare: 15
      }
    ];
  }

  /**
   * Load current ride mock data
   */
  private loadCurrentRide(): void {
    this.currentRide = {
      rideId: 'R001',
      rider: {
        id: 'rider1',
        name: 'John Doe',
        phone: '+91 98765 43210'
      },
      pickup: 'Worli',
      destination: 'Marine Drive',
      fare: 12,
      status: 'Rider Picked Up',
      otp: '1234'
    };
  }

  /**
   * Loading ride history data
   */
  private loadRideHistory(): void {
    this.rideHistory = [
      {
        rideId: 'R001',
        pickup: 'Bandra',
        destination: 'Andheri',
        date: '2024-01-15',
        riderName: 'Alex Smith',
        duration: '25 mins',
        fare: 18,
        rating: 5
      },
      {
        rideId: 'R002',
        pickup: 'Powai',
        destination: 'BKC',
        date: '2024-01-15',
        riderName: 'Priya Sharma',
        duration: '18 mins',
        fare: 15,
        rating: 4
      },
      {
        rideId: 'R003',
        pickup: 'Colaba',
        destination: 'CST',
        date: '2024-01-14',
        riderName: 'Rohit Patel',
        duration: '15 mins',
        fare: 9,
        rating: 5
      }
    ];
  }

  /**
   * Initialize forms with driver data
   */
  private initializeForms(): void {
    this.profileForm.patchValue({
      fullName: this.currentDriver.name,
      currentLocation: 'Bandra West, Mumbai'
    });

    this.vehicleForm.patchValue({
      vehicleType: 'Car',
      vehicleModel: 'Honda City',
      numberPlate: 'MH 01 AB 1234'
    });
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'requests' | 'current' | 'history' | 'profile'): void {
    this.activeTab = tab;
  }

  /**
   * Toggle driver availability
   */
  toggleAvailability(): void {
    console.log('Driver availability changed to:', this.isAvailable);
    
    if (!this.isAvailable) {
      // Clear pending requests when going offline
      this.pendingRequests = [];
    } else {
      // Reload requests when going online
      this.loadMockData();
    }
  }

  /**
   * Accept ride request
   */
  acceptRequest(request: RideRequest): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    console.log('Accepting ride request:', request);
    
    // Simulate API call
    setTimeout(() => {
      this.isProcessing = false;
      
      // Create current ride from accepted request
      this.currentRide = {
        rideId: `R${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        rider: {
          id: request.id,
          name: request.riderName,
          phone: '+91 98765 43210'
        },
        pickup: request.pickup,
        destination: request.destination,
        fare: request.fare,
        status: 'Rider Picked Up',
        otp: Math.floor(1000 + Math.random() * 9000).toString()
      };

      // Remove request from pending list
      this.pendingRequests = this.pendingRequests.filter(req => req.id !== request.id);
      
      // Switch to current ride tab
      this.setActiveTab('current');
      
      alert('Ride request accepted successfully!');
    }, 1500);
  }

  /**
   * Decline ride request
   */
  declineRequest(request: RideRequest): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    console.log('Declining ride request:', request);
    
    // Simulate API call
    setTimeout(() => {
      this.isProcessing = false;
      
      // Remove request from pending list
      this.pendingRequests = this.pendingRequests.filter(req => req.id !== request.id);
      
      alert('Ride request declined.');
    }, 500);
  }

  /**
   * Complete current ride
   */
  completeRide(): void {
    if (!this.currentRide || this.currentRide.status !== 'Rider Picked Up') {
      return;
    }

    const confirmComplete = confirm('Are you sure you want to complete this ride?');
    if (confirmComplete) {
      // Add to history
      this.rideHistory.unshift({
        rideId: this.currentRide.rideId,
        pickup: this.currentRide.pickup,
        destination: this.currentRide.destination,
        date: new Date().toISOString().split('T')[0],
        riderName: this.currentRide.rider.name,
        duration: '20 mins',
        fare: this.currentRide.fare,
        rating: 5
      });

      // Update earnings
      this.earningsSummary.today += this.currentRide.fare;
      this.driverStats.totalRides += 1;
      this.driverStats.monthlyEarnings += this.currentRide.fare;

      this.currentRide = null;
      alert('Ride completed successfully!');
    }
  }

  /**
   * Call rider
   */
  callRider(): void {
    if (this.currentRide) {
      alert(`Calling ${this.currentRide.rider.name}...`);
      // idk how we would do this
    }
  }

  /**
   * Message rider
   */
  messageRider(): void {
    if (this.currentRide) {
      alert(`Opening chat with ${this.currentRide.rider.name}...`);
      // message functionality
    }
  }

  /**
   * Start navigation
   */
  startNavigation(): void {
    if (this.currentRide) {
      alert(`Starting navigation to ${this.currentRide.destination}...`);
      // integrate with maps
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
      console.log('Updating location to:', newLocation);
      alert('Location updated successfully!');
      // Here you would call location update API
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
      localStorage.removeItem('driverToken');
      
      // Navigate to login page
      this.router.navigate(['/register']);
    }
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
   * Generate random OTP
   */
  private generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests(): void {
    this.pendingRequests = [];
  }

  /**
   * Refresh pending requests
   */
  refreshRequests(): void {
    if (this.isAvailable) {
      this.loadMockData();
    }
  }
}