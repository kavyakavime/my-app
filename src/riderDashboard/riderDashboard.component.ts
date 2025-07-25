import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError, Subscription, interval } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

interface Driver {
  id: string;
  name: string;
  carModel: string;
  plateNumber: string;
  rating: number;
  phone?: string;
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
  otp?: string;
  requestedAt?: string;
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
  driver?: {
    name: string;
    vehicle: string;
    plateNumber: string;
  };
}

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  rides?: T;
  currentRide?: T;
  profile?: T;
  ride?: T;
  count?: number;
}

interface RiderApiData {
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

interface RideApiData {
  id: number;
  ride_id: string;
  pickup_location: string;
  destination: string;
  ride_type: string;
  status: string;
  estimated_fare: string;
  final_fare?: string | null;
  created_at: string;
  completed_at?: string | null;
  driver_name?: string | null;
  make?: string | null;
  model?: string | null;
  plate_number?: string | null;
}

@Component({
  selector: 'app-rider-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './riderDashboard.component.html',
  styleUrls: ['./riderDashboard.component.scss']
})
export class RiderDashboardComponent implements OnInit, OnDestroy {
  activeTab: 'book' | 'current' | 'history' = 'book';
  bookingForm: FormGroup;
  
  // State variables
  isSearching = false;
  isBooking = false;
  isLoading = false;
  
  // Location autocomplete variables
  pickupSuggestions: LocationSuggestion[] = [];
  destinationSuggestions: LocationSuggestion[] = [];
  showPickupSuggestions = false;
  showDestinationSuggestions = false;
  isLoadingPickupSuggestions = false;
  isLoadingDestinationSuggestions = false;
  
  // Selected locations
  selectedPickupLocation: LocationSuggestion | null = null;
  selectedDestinationLocation: LocationSuggestion | null = null;
  
  private readonly LOCATIONIQ_API_KEY = 'pk.33a6b675d1b70adc3f79b26403bad615';
  private readonly LOCATIONIQ_BASE_URL = 'https://api.locationiq.com/v1/autocomplete';
  private readonly API_URL = 'http://localhost:3000/api';
  
  // Data
  currentUser: User = {
    id: '',
    name: '',
    email: '',
    phoneNumber: ''
  };

  availableRides: AvailableRide[] = [];
  currentRide: CurrentRide | null = null;
  rideHistory: RideHistory[] = [];

  // API data storage
  riderData: RiderApiData | null = null;
  riderId: number | null = null;

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];
  private currentRidePolling: Subscription | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.bookingForm = this.formBuilder.group({
      pickupLocation: ['', Validators.required],
      destination: ['', Validators.required],
      rideType: ['car', Validators.required],
      when: ['now', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.currentRidePolling) {
      this.currentRidePolling.unsubscribe();
    }
  }

  /**
   * Load user profile from localStorage and API
   */
  private loadUserProfile(): void {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');

    if (userId && userName && userEmail) {
      this.currentUser = {
        id: userId,
        name: userName,
        email: userEmail,
        phoneNumber: '' // Will be loaded from API
      };
      
      // Load rider data from API
      this.loadRiderData(userEmail);
    } else {
      // Redirect to login if no user data
      this.router.navigate(['/sign-in']);
      return;
    }
  }

  /**
   * Load rider data from API using email
   */
  private loadRiderData(email: string): void {
    const sub = this.http.get<ApiResponse<RiderApiData>>(`${this.API_URL}/rider/email/${email}`).subscribe({
      next: (response) => {
        if (response.data) {
          this.riderData = response.data;
          this.riderId = response.data.id;
          this.currentUser.phoneNumber = response.data.phone_number;
          this.currentUser.name = response.data.full_name;
          
          // Load rider's rides
          this.loadRideHistory();
          this.loadCurrentRide();
          this.setupLocationAutocomplete();
          this.startCurrentRidePolling();
        }
      },
      error: (error) => {
        console.error('Error loading rider data:', error);
        this.router.navigate(['/sign-in']);
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load current ride from API
   */
  private loadCurrentRide(): void {
    if (!this.riderId) return;

    const sub = this.http.get<ApiResponse<RideApiData[]>>(`${this.API_URL}/rider/${this.riderId}/rides`).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          // Find the most recent active ride
          const activeRide = response.data.find(ride => 
            ['requested', 'accepted', 'driver_on_way', 'rider_picked_up'].includes(ride.status)
          );
          
          if (activeRide) {
            this.currentRide = this.mapApiRideToCurrentRide(activeRide);
            this.setActiveTab('current');
          } else {
            this.currentRide = null;
          }
        } else {
          this.currentRide = null;
        }
      },
      error: (error) => {
        console.error('Error loading current ride:', error);
        this.currentRide = null;
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load ride history from API
   */
  private loadRideHistory(): void {
    if (!this.riderId) return;

    const sub = this.http.get<ApiResponse<RideApiData[]>>(`${this.API_URL}/rider/${this.riderId}/rides`).subscribe({
      next: (response) => {
        if (response.data) {
          this.rideHistory = response.data
            .filter(ride => ['completed', 'cancelled'].includes(ride.status))
            .map(ride => this.mapApiRideToRideHistory(ride));
        } else {
          this.rideHistory = [];
        }
      },
      error: (error) => {
        console.error('Error loading ride history:', error);
        this.rideHistory = [];
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Map API ride data to CurrentRide interface
   */
  private mapApiRideToCurrentRide(ride: RideApiData): CurrentRide {
    return {
      rideId: ride.ride_id,
      status: ride.status,
      driver: ride.driver_name ? {
        id: '1',
        name: ride.driver_name,
        carModel: ride.make && ride.model ? `${ride.make} ${ride.model}` : 'Vehicle',
        plateNumber: ride.plate_number || 'N/A',
        rating: 4.5 // Default rating since not in API
      } : {
        id: '',
        name: 'Driver Not Assigned',
        carModel: '',
        plateNumber: '',
        rating: 0
      },
      eta: ride.status === 'driver_on_way' ? '5 mins' : 'N/A',
      fare: parseFloat((ride.final_fare || ride.estimated_fare) || '0') || 0,
      pickup: ride.pickup_location,
      destination: ride.destination,
      otp: '1234', // Default OTP since not in API
      requestedAt: ride.created_at
    };
  }

  /**
   * Map API ride data to RideHistory interface
   */
  private mapApiRideToRideHistory(ride: RideApiData): RideHistory {
    return {
      rideId: ride.ride_id,
      pickup: ride.pickup_location,
      destination: ride.destination,
      date: ride.completed_at || ride.created_at,
      driverName: ride.driver_name || 'N/A',
      fare: parseFloat((ride.final_fare || ride.estimated_fare) || '0') || 0,
      status: ride.status as 'completed' | 'cancelled',
      driver: ride.driver_name ? {
        name: ride.driver_name,
        vehicle: ride.make && ride.model ? `${ride.make} ${ride.model}` : 'Vehicle',
        plateNumber: ride.plate_number || 'N/A'
      } : undefined
    };
  }

  /**
   * Start polling for current ride updates
   */
  private startCurrentRidePolling(): void {
    // Poll every 30 seconds for current ride updates
    this.currentRidePolling = interval(30000).subscribe(() => {
      if (this.currentRide && this.activeTab === 'current') {
        this.loadCurrentRide();
      }
    });
  }

  /**
   * Setup location autocomplete functionality
   */
  private setupLocationAutocomplete(): void {
    // Pickup location autocomplete
    const pickupSub = this.bookingForm.get('pickupLocation')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) {
          this.pickupSuggestions = [];
          this.showPickupSuggestions = false;
          return of([]);
        }
        
        if (this.selectedPickupLocation && query === this.selectedPickupLocation.display_name) {
          return of([]);
        }
        
        this.isLoadingPickupSuggestions = true;
        return this.searchLocations(query);
      }),
      catchError(error => {
        console.error('Error searching pickup locations:', error);
        this.isLoadingPickupSuggestions = false;
        return of([]);
      })
    ).subscribe(suggestions => {
      this.pickupSuggestions = suggestions;
      this.showPickupSuggestions = suggestions.length > 0;
      this.isLoadingPickupSuggestions = false;
    });

    // Destination autocomplete
    const destinationSub = this.bookingForm.get('destination')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) {
          this.destinationSuggestions = [];
          this.showDestinationSuggestions = false;
          return of([]);
        }
        
        if (this.selectedDestinationLocation && query === this.selectedDestinationLocation.display_name) {
          return of([]);
        }
        
        this.isLoadingDestinationSuggestions = true;
        return this.searchLocations(query);
      }),
      catchError(error => {
        console.error('Error searching destination locations:', error);
        this.isLoadingDestinationSuggestions = false;
        return of([]);
      })
    ).subscribe(suggestions => {
      this.destinationSuggestions = suggestions;
      this.showDestinationSuggestions = suggestions.length > 0;
      this.isLoadingDestinationSuggestions = false;
    });

    if (pickupSub) this.subscriptions.push(pickupSub);
    if (destinationSub) this.subscriptions.push(destinationSub);
  }

  /**
   * Search locations using LocationIQ API
   */
  private searchLocations(query: string) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.LOCATIONIQ_BASE_URL}?key=${this.LOCATIONIQ_API_KEY}&q=${encodedQuery}&limit=5&format=json`;
    
    return this.http.get<LocationSuggestion[]>(url).pipe(
      catchError(error => {
        console.error('LocationIQ API error:', error);
        return of([]);
      })
    );
  }

  /**
   * Select pickup location from suggestions
   */
  selectPickupLocation(suggestion: LocationSuggestion): void {
    this.selectedPickupLocation = suggestion;
    this.bookingForm.get('pickupLocation')?.setValue(suggestion.display_name);
    this.showPickupSuggestions = false;
    this.pickupSuggestions = [];
  }

  /**
   * Select destination location from suggestions
   */
  selectDestinationLocation(suggestion: LocationSuggestion): void {
    this.selectedDestinationLocation = suggestion;
    this.bookingForm.get('destination')?.setValue(suggestion.display_name);
    this.showDestinationSuggestions = false;
    this.destinationSuggestions = [];
  }

  /**
   * Handle input focus for pickup
   */
  onPickupInputFocus(): void {
    const query = this.bookingForm.get('pickupLocation')?.value;
    if (query && query.length >= 3 && this.pickupSuggestions.length > 0) {
      this.showPickupSuggestions = true;
    }
  }

  /**
   * Handle input focus for destination
   */
  onDestinationInputFocus(): void {
    const query = this.bookingForm.get('destination')?.value;
    if (query && query.length >= 3 && this.destinationSuggestions.length > 0) {
      this.showDestinationSuggestions = true;
    }
  }

  /**
   * Hide pickup suggestions when clicking outside
   */
  hidePickupSuggestions(): void {
    setTimeout(() => {
      this.showPickupSuggestions = false;
    }, 200);
  }

  /**
   * Hide destination suggestions when clicking outside
   */
  hideDestinationSuggestions(): void {
    setTimeout(() => {
      this.showDestinationSuggestions = false;
    }, 200);
  }

  /**
   * Handle Enter key press in input fields
   */
  onInputKeydown(event: KeyboardEvent, type: 'pickup' | 'destination'): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      const suggestions = type === 'pickup' ? this.pickupSuggestions : this.destinationSuggestions;
      if (suggestions.length > 0) {
        if (type === 'pickup') {
          this.selectPickupLocation(suggestions[0]);
        } else {
          this.selectDestinationLocation(suggestions[0]);
        }
      }
    } else if (event.key === 'Escape') {
      if (type === 'pickup') {
        this.showPickupSuggestions = false;
      } else {
        this.showDestinationSuggestions = false;
      }
    }
  }

  /**
   * Clear pickup location
   */
  clearPickupLocation(): void {
    this.selectedPickupLocation = null;
    this.bookingForm.get('pickupLocation')?.setValue('');
    this.pickupSuggestions = [];
    this.showPickupSuggestions = false;
  }

  /**
   * Clear destination location
   */
  clearDestinationLocation(): void {
    this.selectedDestinationLocation = null;
    this.bookingForm.get('destination')?.setValue('');
    this.destinationSuggestions = [];
    this.showDestinationSuggestions = false;
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'book' | 'current' | 'history'): void {
    this.activeTab = tab;
    
    // Refresh data when switching to tabs
    if (tab === 'current') {
      this.loadCurrentRide();
    } else if (tab === 'history') {
      this.loadRideHistory();
    }
  }

  /**
   * Find available rides
   */
  findRides(): void {
    if (!this.bookingForm.valid || this.isSearching) {
      return;
    }

    if (!this.selectedPickupLocation || !this.selectedDestinationLocation) {
      alert('Please select valid pickup and destination locations from the suggestions.');
      return;
    }

    this.isSearching = true;

    const rideData = {
      pickupLocation: this.selectedPickupLocation.display_name,
      destination: this.selectedDestinationLocation.display_name,
      rideType: this.bookingForm.get('rideType')?.value,
      when: this.bookingForm.get('when')?.value
    };

    // Since the rider/rides/request endpoint doesn't exist, we'll simulate the request
    // In a real implementation, you would use the API endpoint
    setTimeout(() => {
      this.isSearching = false;
      // Simulate successful ride request
      alert('Ride requested successfully! Looking for available drivers...');
      this.resetBookingForm();
      
      // Create a mock current ride
      this.currentRide = {
        rideId: 'R' + Date.now().toString().slice(-6),
        status: 'requested',
        driver: {
          id: '',
          name: 'Looking for driver...',
          carModel: '',
          plateNumber: '',
          rating: 0
        },
        eta: 'Searching...',
        fare: Math.floor(Math.random() * 20) + 10,
        pickup: rideData.pickupLocation,
        destination: rideData.destination,
        requestedAt: new Date().toISOString()
      };
      
      this.setActiveTab('current');
    }, 2000);
  }

  /**
   * Book a specific ride (if there are multiple options)
   */
  bookRide(ride: AvailableRide): void {
    if (this.isBooking) {
      return;
    }

    this.isBooking = true;
    
    // In a real implementation, this would accept a specific driver's offer
    setTimeout(() => {
      this.isBooking = false;
      this.loadCurrentRide();
      this.setActiveTab('current');
      this.availableRides = [];
      this.resetBookingForm();
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
      // Simulate cancellation since we don't have the cancel endpoint
      this.currentRide = null;
      alert('Ride cancelled successfully!');
      
      // Refresh ride history to show cancelled ride
      this.loadRideHistory();
    }
  }

  /**
   * Call driver
   */
  callDriver(): void {
    if (this.currentRide && this.currentRide.driver) {
      alert(`Calling ${this.currentRide.driver.name}...`);
      // In a real app, this would initiate a phone call
    }
  }

  /**
   * Message driver
   */
  messageDriver(): void {
    if (this.currentRide && this.currentRide.driver) {
      alert(`Opening chat with ${this.currentRide.driver.name}...`);
      // In a real app, this would open a messaging interface
    }
  }

  /**
   * View ride details
   */
  viewRideDetails(ride: RideHistory): void {
    alert(`Viewing details for ride ${ride.rideId}`);
    // In a real app, this would navigate to a detailed view or open a modal
  }

  /**
   * Rate a completed ride
   */
  rateRide(ride: RideHistory): void {
    if (ride.status !== 'completed') {
      return;
    }

    const rating = prompt('Rate your driver (1-5 stars):');
    if (rating && parseInt(rating) >= 1 && parseInt(rating) <= 5) {
      const comment = prompt('Add a comment (optional):') || '';
      
      // Simulate rating submission and assign rating to the ride object
      (ride as any).rating = parseInt(rating);
      alert('Thank you for your feedback!');
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      // Clear stored data
      localStorage.removeItem('userToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userType');
      
      // Navigate to home page
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
    this.selectedPickupLocation = null;
    this.selectedDestinationLocation = null;
    this.pickupSuggestions = [];
    this.destinationSuggestions = [];
    this.showPickupSuggestions = false;
    this.showDestinationSuggestions = false;
  }

  /**
   * Check if booking form is valid
   */
  get isBookingFormValid(): boolean {
    return this.bookingForm.valid && this.selectedPickupLocation !== null && this.selectedDestinationLocation !== null;
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
   * Get status CSS class
   */
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'requested': 'status-requested',
      'accepted': 'status-accepted',
      'driver_on_way': 'status-on-way',
      'rider_picked_up': 'status-in-progress',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  /**
   * Check if ride can be cancelled
   */
  canCancelRide(ride: CurrentRide | null): boolean {
    if (!ride) return false;
    return ['requested', 'accepted', 'driver_on_way'].includes(ride.status);
  }

  /**
   * Check if ride can be rated
   */
  canRateRide(ride: RideHistory): boolean {
    return ride.status === 'completed' && !ride.rating;
  }

  /**
   * Refresh current data
   */
  refreshData(): void {
    this.isLoading = true;
    
    if (this.activeTab === 'current') {
      this.loadCurrentRide();
    } else if (this.activeTab === 'history') {
      this.loadRideHistory();
    }
    
    // Simulate loading time
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }
}