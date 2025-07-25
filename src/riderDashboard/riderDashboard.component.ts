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
    this.loadCurrentRide();
    this.loadRideHistory();
    this.setupLocationAutocomplete();
    this.startCurrentRidePolling();
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
        phoneNumber: '' // Will be loaded from API if needed
      };
    } else {
      // Redirect to login if no user data
      this.router.navigate(['/sign-in']);
      return;
    }

    // Optionally load full profile from API
    this.loadFullProfile();
  }

  /**
   * Load full user profile from API
   */
  private loadFullProfile(): void {
    const sub = this.http.get<ApiResponse<any>>(`${this.API_URL}/rider/profile`).subscribe({
      next: (response) => {
        if (response.profile) {
          this.currentUser.phoneNumber = response.profile.phoneNumber || '';
        }
      },
      error: (error) => {
        console.warn('Could not load full profile:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load current ride from API
   */
  private loadCurrentRide(): void {
    const sub = this.http.get<ApiResponse<CurrentRide>>(`${this.API_URL}/rider/rides/current`).subscribe({
      next: (response) => {
        this.currentRide = response.currentRide || null;
        if (this.currentRide && ['requested', 'accepted', 'driver_on_way', 'rider_picked_up'].includes(this.currentRide.status)) {
          this.setActiveTab('current');
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
    const sub = this.http.get<ApiResponse<RideHistory[]>>(`${this.API_URL}/rider/rides/history?limit=20`).subscribe({
      next: (response) => {
        this.rideHistory = (response.rides as RideHistory[]) || [];
      },
      error: (error) => {
        console.error('Error loading ride history:', error);
        this.rideHistory = [];
      }
    });
    this.subscriptions.push(sub);
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

    const sub = this.http.post<ApiResponse<any>>(`${this.API_URL}/rider/rides/request`, rideData).subscribe({
      next: (response) => {
        this.isSearching = false;
        if (response.ride || response.data) {
          // Ride requested successfully, switch to current ride tab
          this.loadCurrentRide();
          this.setActiveTab('current');
          this.resetBookingForm();
          alert('Ride requested successfully! Looking for available drivers...');
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error requesting ride:', error);
        const errorMessage = error.error?.message || 'Failed to request ride. Please try again.';
        alert(errorMessage);
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
    if (confirmCancel) {
      const sub = this.http.post<ApiResponse<any>>(`${this.API_URL}/rider/rides/${this.currentRide.rideId}/cancel`, {
        reason: 'Cancelled by rider'
      }).subscribe({
        next: (response) => {
          this.currentRide = null;
          this.loadRideHistory(); // Refresh history to show cancelled ride
          alert('Ride cancelled successfully!');
        },
        error: (error) => {
          console.error('Error cancelling ride:', error);
          const errorMessage = error.error?.message || 'Failed to cancel ride. Please try again.';
          alert(errorMessage);
        }
      });
      this.subscriptions.push(sub);
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
      
      const sub = this.http.post<ApiResponse<any>>(`${this.API_URL}/rider/rides/${ride.rideId}/rate`, {
        rating: parseInt(rating),
        comment: comment
      }).subscribe({
        next: (response) => {
          ride.rating = parseInt(rating);
          alert('Thank you for your feedback!');
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
      const sub = this.http.get<ApiResponse<RideHistory[]>>(`${this.API_URL}/rider/rides/history?limit=20`).subscribe({
        next: (response) => {
          this.rideHistory = (response.rides as RideHistory[]) || [];
        },
        error: (error) => {
          console.error('Error loading ride history:', error);
        }
      });
      this.subscriptions.push(sub);
    }
    
    // Simulate loading time
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }
}