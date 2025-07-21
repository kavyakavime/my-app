import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';


interface User {
  id: string;
  name: string;
  email: string;
}

interface Driver {
  id: string;
  name: string;
  carModel: string;
  plateNumber: string;
  rating: number;
}

interface AvailableRide {
  id: string;
  driverName: string;
  carModel: string;
  plateNumber: string;
  rating: number;
  eta: string;
  price: number;
}

interface CurrentRide {
  rideId: string;
  status: string;
  driver: Driver;
  eta: string;
  fare: number;
  pickup: string;
  destination: string;
}

interface RideHistory {
  rideId: string;
  pickup: string;
  destination: string;
  date: string;
  driverName: string;
  fare: number;
  status: 'completed' | 'cancelled';
  rating?: number;
}

@Component({
  selector: 'app-rider-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './riderDashboard.component.html',
  styleUrls: ['./riderDashboard.component.scss']
})
export class RiderDashboardComponent implements OnInit {
  activeTab: 'book' | 'current' | 'history' = 'book';
  bookingForm: FormGroup;
  
  // State variables
  isSearching = false;
  isBooking = false;
  
  // Data
  currentUser: User = {
    id: 'user1',
    name: 'Alex',
    email: 'alex@example.com'
  };

  availableRides: AvailableRide[] = [];
  currentRide: CurrentRide | null = null;
  rideHistory: RideHistory[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.bookingForm = this.formBuilder.group({
      pickupLocation: ['', Validators.required],
      destination: ['', Validators.required],
      rideType: ['car', Validators.required],
      when: ['now', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadMockData();
    this.loadCurrentRide();
    this.loadRideHistory();
  }

  /**
   * Load mock data for available rides
   */
  private loadMockData(): void {
    this.availableRides = [
      {
        id: 'ride1',
        driverName: 'Rajesh Kumar',
        carModel: 'Honda City',
        plateNumber: 'MH 01 AB 1234',
        rating: 4.8,
        eta: '2 mins away',
        price: 12
      },
      {
        id: 'ride2',
        driverName: 'Suresh Sharma',
        carModel: 'Maruti Swift',
        plateNumber: 'MH 02 CD 5678',
        rating: 4.6,
        eta: '4 mins away',
        price: 11
      },
      {
        id: 'ride3',
        driverName: 'Amit Patel',
        carModel: 'Hyundai i20',
        plateNumber: 'MH 03 EF 9012',
        rating: 4.9,
        eta: '6 mins away',
        price: 13
      }
    ];
  }

  /**
   * Load current ride data
   */
  private loadCurrentRide(): void {
    // Mock current ride data
    this.currentRide = {
      rideId: 'R001',
      status: 'Driver On The Way',
      driver: {
        id: 'driver1',
        name: 'John Doe',
        carModel: 'Honda City',
        plateNumber: 'MH 01 AB 1234',
        rating: 4.8
      },
      eta: '5 mins',
      fare: 12,
      pickup: 'Pickup Location',
      destination: 'Destination'
    };
  }

  /**
   * Load ride history data
   */
  private loadRideHistory(): void {
    this.rideHistory = [
      {
        rideId: 'R001',
        pickup: 'Bandra West',
        destination: 'Andheri East',
        date: '2024-01-15',
        driverName: 'Rajesh Kumar',
        fare: 18,
        status: 'completed',
        rating: 5
      },
      {
        rideId: 'R002',
        pickup: 'Powai',
        destination: 'BKC',
        date: '2024-01-14',
        driverName: 'Suresh Sharma',
        fare: 22,
        status: 'completed',
        rating: 4
      },
      {
        rideId: 'R003',
        pickup: 'Colaba',
        destination: 'Marine Drive',
        date: '2024-01-13',
        driverName: '',
        fare: 9,
        status: 'cancelled'
      }
    ];
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'book' | 'current' | 'history'): void {
    this.activeTab = tab;
  }

  /**
   * Find available rides
   */
  findRides(): void {
    if (!this.bookingForm.valid || this.isSearching) {
      return;
    }

    this.isSearching = true;

    // Simulate API call
    setTimeout(() => {
      this.isSearching = false;
      // Mock data is already loaded
      console.log('Rides found:', this.availableRides);
    }, 2000);
  }

  /**
   * Book a ride
   */
  bookRide(ride: AvailableRide): void {
    if (this.isBooking) {
      return;
    }

    this.isBooking = true;
    
    console.log('Booking ride:', ride);
    
    // Simulate booking API call
    setTimeout(() => {
      this.isBooking = false;
      
      // Create current ride from booked ride
      this.currentRide = {
        rideId: `R${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: 'Driver On The Way',
        driver: {
          id: ride.id,
          name: ride.driverName,
          carModel: ride.carModel,
          plateNumber: ride.plateNumber,
          rating: ride.rating
        },
        eta: ride.eta,
        fare: ride.price,
        pickup: this.bookingForm.get('pickupLocation')?.value || '',
        destination: this.bookingForm.get('destination')?.value || ''
      };

      // Switch to current ride tab
      this.setActiveTab('current');
      
      // Clear available rides
      this.availableRides = [];
      
      alert('Ride booked successfully!');
    }, 1500);
  }

  /**
   * Cancel current ride
   */
  cancelRide(): void {
    if (!this.currentRide) {
      return;
    }

    const confirmCancel = confirm('Are you sure you want to cancel this ride?');
    if (confirmCancel) {
      // Add to history as cancelled
      this.rideHistory.unshift({
        rideId: this.currentRide.rideId,
        pickup: this.currentRide.pickup,
        destination: this.currentRide.destination,
        date: new Date().toISOString().split('T')[0],
        driverName: this.currentRide.driver.name,
        fare: this.currentRide.fare,
        status: 'cancelled'
      });

      this.currentRide = null;
      alert('Ride cancelled successfully!');
    }
  }

  /**
   * Call driver
   */
  callDriver(): void {
    if (this.currentRide) {
      alert(`Calling ${this.currentRide.driver.name}...`);
      // Here you would implement actual calling functionality
    }
  }

  /**
   * Message driver
   */
  messageDriver(): void {
    if (this.currentRide) {
      alert(`Opening chat with ${this.currentRide.driver.name}...`);
      // Here you would implement messaging functionality
    }
  }

  /**
   * View ride details
   */
  viewRideDetails(ride: RideHistory): void {
    alert(`Viewing details for ride ${ride.rideId}`);
    // invoice like??
  }

  /**
   * Logout user
   */
  logout(): void {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      // Clear any stored data
      localStorage.removeItem('userToken');
      
      // Navigate to login page
      this.router.navigate(['/register']);
    }
  }

  /**
   * Reset booking form
   */
  resetBookingForm(): void {
    this.bookingForm.reset({
      pickupLocation: '',
      destination: '',
      rideType: 'car',
      when: 'now'
    });
    this.availableRides = [];
  }

  /**
   * Check if booking form is valid
   */
  get isBookingFormValid(): boolean {
    return this.bookingForm.valid;
  }

  /**
   * Get pickup location value
   */
  get pickupLocation(): string {
    return this.bookingForm.get('pickupLocation')?.value || '';
  }

  /**
   * Get destination value
   */
  get destination(): string {
    return this.bookingForm.get('destination')?.value || '';
  }

  /**
   * Check if user has current ride
   */
  get hasCurrentRide(): boolean {
    return this.currentRide !== null;
  }

  /**
   * Check if user has ride history
   */
  get hasRideHistory(): boolean {
    return this.rideHistory.length > 0;
  }

  /**
   * Get formatted date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}