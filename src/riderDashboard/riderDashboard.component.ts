import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
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
  success?: boolean;
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

interface CurrentRideApiData {
  id: number;
  rider_id: number;
  driver_id?: number | null;
  pickup_location: string;
  destination: string;
  ride_type: string;
  status: string;
  estimated_fare: string;
  final_fare?: string | null;
  created_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  otp?: string;
  driver?: {
    id: number;
    full_name: string;
    phone_number: string;
    make?: string;
    model?: string;
    plate_number?: string;
    rating?: string;
  } | null;
}

interface RideRequestData {
  pickup_location: string;
  destination: string;
  ride_type: string;
  estimated_fare: number;
  pickup_coordinates?: {
    lat: number;
    lng: number;
  };
  destination_coordinates?: {
    lat: number;
    lng: number;
  };
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
          
          // Load rider's rides and current ride
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

    const headers = this.getAuthHeaders();
    const sub = this.http.get<ApiResponse<CurrentRideApiData>>(
      `${this.API_URL}/rider/rides/current`, 
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.currentRide = this.mapApiCurrentRideToCurrentRide(response.data);
          if (this.currentRide && this.currentRide.status !== 'completed' && this.currentRide.status !== 'cancelled') {
            this.setActiveTab('current');
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

    const headers = this.getAuthHeaders();
    const sub = this.http.get<ApiResponse<RideApiData[]>>(
      `${this.API_URL}/rider/rides/history`, 
      { headers }
    ).subscribe({
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
   * Map API current ride data to CurrentRide interface
   */
  private mapApiCurrentRideToCurrentRide(ride: CurrentRideApiData): CurrentRide {
    return {
      rideId: ride.id.toString(),
      status: ride.status,
      driver: ride.driver ? {
        id: ride.driver.id.toString(),
        name: ride.driver.full_name,
        carModel: ride.driver.make && ride.driver.model ? `${ride.driver.make} ${ride.driver.model}` : 'Vehicle',
        plateNumber: ride.driver.plate_number || 'N/A',
        rating: parseFloat(ride.driver.rating || '4.5'),
        phone: ride.driver.phone_number
      } : {
        id: '',
        name: 'Driver Not Assigned',
        carModel: '',
        plateNumber: '',
        rating: 0
      },
      eta: this.calculateETA(ride.status),
      fare: parseFloat((ride.final_fare || ride.estimated_fare) || '0') || 0,
      pickup: ride.pickup_location,
      destination: ride.destination,
      otp: ride.otp || '',
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
   * Calculate ETA based on ride status
   */
  private calculateETA(status: string): string {
    const etaMap: { [key: string]: string } = {
      'requested': 'Looking for driver...',
      'accepted': '5-10 mins',
      'driver_on_way': '3-5 mins',
      'rider_picked_up': 'In transit',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return etaMap[status] || 'N/A';
  }

  /**
   * Start polling for current ride updates
   */
  private startCurrentRidePolling(): void {
    // Poll every 10 seconds for current ride updates
    this.currentRidePolling = interval(10000).subscribe(() => {
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
   * Calculate estimated fare based on distance
   */
  private calculateEstimatedFare(pickup: LocationSuggestion, destination: LocationSuggestion, rideType: string): number {
    // Simple fare calculation based on distance
    const lat1 = parseFloat(pickup.lat);
    const lon1 = parseFloat(pickup.lon);
    const lat2 = parseFloat(destination.lat);
    const lon2 = parseFloat(destination.lon);
    
    // Calculate distance in km using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Base fare + distance-based fare
    const baseFare = { car: 50, bike: 30, auto: 40 }[rideType] || 50;
    const perKmRate = { car: 12, bike: 8, auto: 10 }[rideType] || 12;
    
    return Math.round(baseFare + (distance * perKmRate));
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
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
   * Request a ride - creates ride request in database
   */
  findRides(): void {
    if (!this.bookingForm.valid || this.isSearching) {
      return;
    }

    if (!this.selectedPickupLocation || !this.selectedDestinationLocation) {
      alert('Please select valid pickup and destination locations from the suggestions.');
      return;
    }

    if (!this.riderId) {
      alert('User data not loaded. Please refresh the page.');
      return;
    }

    this.isSearching = true;

    const rideType = this.bookingForm.get('rideType')?.value;
    const estimatedFare = this.calculateEstimatedFare(
      this.selectedPickupLocation, 
      this.selectedDestinationLocation, 
      rideType
    );

    const rideRequestData: RideRequestData = {
      pickup_location: this.selectedPickupLocation.display_name,
      destination: this.selectedDestinationLocation.display_name,
      ride_type: rideType,
      estimated_fare: estimatedFare,
      pickup_coordinates: {
        lat: parseFloat(this.selectedPickupLocation.lat),
        lng: parseFloat(this.selectedPickupLocation.lon)
      },
      destination_coordinates: {
        lat: parseFloat(this.selectedDestinationLocation.lat),
        lng: parseFloat(this.selectedDestinationLocation.lon)
      }
    };

    const headers = this.getAuthHeaders();
    const sub = this.http.post<ApiResponse<CurrentRideApiData>>(
      `${this.API_URL}/rider/rides/request`,
      rideRequestData,
      { headers }
    ).subscribe({
      next: (response) => {
        this.isSearching = false;
        
        if (response.success && response.data) {
          alert('Ride requested successfully! Looking for available drivers...');
          this.currentRide = this.mapApiCurrentRideToCurrentRide(response.data);
          this.resetBookingForm();
          this.setActiveTab('current');
        } else {
          alert(response.message || 'Failed to request ride. Please try again.');
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error requesting ride:', error);
        
        if (error.status === 400) {
          alert('You already have an active ride. Please complete or cancel it first.');
        } else {
          alert('Failed to request ride. Please try again.');
        }
      }
    });

    this.subscriptions.push(sub);
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
    if (!confirmCancel) {
      return;
    }

    const headers = this.getAuthHeaders();
    const reason = 'Cancelled by rider';

    const sub = this.http.post<ApiResponse<any>>(
      `${this.API_URL}/rider/rides/current/cancel`,
      { reason },
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.currentRide = null;
          alert('Ride cancelled successfully!');
          this.loadRideHistory(); // Refresh history to show cancelled ride
          this.setActiveTab('book');
        } else {
          alert(response.message || 'Failed to cancel ride.');
        }
      },
      error: (error) => {
        console.error('Error cancelling ride:', error);
        alert('Failed to cancel ride. Please try again.');
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Call driver
   */
  callDriver(): void {
    if (this.currentRide && this.currentRide.driver && this.currentRide.driver.phone) {
      alert(`Calling ${this.currentRide.driver.name} at ${this.currentRide.driver.phone}...`);
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
      
      const headers = this.getAuthHeaders();
      const sub = this.http.post<ApiResponse<any>>(
        `${this.API_URL}/rider/rides/${ride.rideId}/rate`,
        { rating: parseInt(rating), comment },
        { headers }
      ).subscribe({
        next: (response) => {
          if (response.success) {
            (ride as any).rating = parseInt(rating);
            alert('Thank you for your feedback!');
          } else {
            alert('Failed to submit rating. Please try again.');
          }
        },
        error: (error) => {
          console.error('Error submitting rating:', error);
          alert('Failed to submit rating. Please try again.');
        }
      });

      this.subscriptions.push(sub);
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
      localStorage.removeItem('sessionToken');
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