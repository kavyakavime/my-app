import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

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

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

@Component({
  selector: 'app-rider-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './riderDashboard.component.html',
  styleUrls: ['./riderDashboard.component.scss']
})
export class RiderDashboardComponent implements OnInit {
  activeTab: 'book' | 'current' | 'history' = 'book';
  bookingForm: FormGroup;
  
  // State variables
  isSearching = false;
  isBooking = false;
  
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
    this.loadMockData();
    this.loadCurrentRide();
    this.loadRideHistory();
    this.setupLocationAutocomplete();
  }

  /**
   * Setup location autocomplete functionality
   */
  private setupLocationAutocomplete(): void {
    // Pickup location autocomplete
    this.bookingForm.get('pickupLocation')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) {
          this.pickupSuggestions = [];
          this.showPickupSuggestions = false;
          return of([]);
        }
        
        // Don't search if user has selected a suggestion
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
    this.bookingForm.get('destination')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) {
          this.destinationSuggestions = [];
          this.showDestinationSuggestions = false;
          return of([]);
        }
        
        // Don't search if user has selected a suggestion
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
    // Use setTimeout to allow click events on suggestions to fire first
    setTimeout(() => {
      this.showPickupSuggestions = false;
    }, 200);
  }

  /**
   * Hide destination suggestions when clicking outside
   */
  hideDestinationSuggestions(): void {
    // Use setTimeout to allow click events on suggestions to fire first
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
        // Select the first suggestion
        if (type === 'pickup') {
          this.selectPickupLocation(suggestions[0]);
        } else {
          this.selectDestinationLocation(suggestions[0]);
        }
      }
    } else if (event.key === 'Escape') {
      // Hide suggestions on Escape
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

    // Ensure both locations are selected
    if (!this.selectedPickupLocation || !this.selectedDestinationLocation) {
      alert('Please select valid pickup and destination locations from the suggestions.');
      return;
    }

    this.isSearching = true;

    // Simulate API call
    setTimeout(() => {
      this.isSearching = false;
      // Mock data is already loaded
      console.log('Rides found:', this.availableRides);
      console.log('Pickup coordinates:', this.selectedPickupLocation?.lat, this.selectedPickupLocation?.lon);
      console.log('Destination coordinates:', this.selectedDestinationLocation?.lat, this.selectedDestinationLocation?.lon);
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
        pickup: this.selectedPickupLocation?.display_name || '',
        destination: this.selectedDestinationLocation?.display_name || ''
      };

      // Switch to current ride tab
      this.setActiveTab('current');
      
      // Clear available rides and reset form
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
      this.router.navigate(['/signin']);
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
}