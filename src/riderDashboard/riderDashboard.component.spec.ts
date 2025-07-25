import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RiderDashboardComponent } from './riderDashboard.component';
import { of, throwError } from 'rxjs';

describe('RiderDashboardComponent', () => {
  let component: RiderDashboardComponent;
  let fixture: ComponentFixture<RiderDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let httpMock: HttpTestingController;

  const mockUser = {
    id: '3',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phoneNumber: '+1234567892'
  };

  const mockRiderData = {
    id: 3,
    user_id: 3,
    full_name: 'Priya Sharma',
    email: 'priya@example.com',
    phone_number: '+1234567892',
    emergency_contact_name: 'Suresh Sharma',
    emergency_contact_phone: '+919876543213',
    preferred_payment_method: 'wallet',
    created_at: '2025-07-23T22:15:24.000Z',
    is_verified: 1,
    is_active: 1
  };

  const mockRideHistory = [
    {
      id: 1,
      ride_id: 'R001',
      pickup_location: 'Bandra West Railway Station',
      destination: 'Andheri East Metro Station',
      ride_type: 'car',
      status: 'completed',
      estimated_fare: '18.00',
      final_fare: '18.00',
      created_at: '2025-07-23T22:15:24.000Z',
      completed_at: '2024-01-20T15:30:00.000Z',
      driver_name: 'Rajesh Kumar',
      make: 'Honda',
      model: 'City',
      plate_number: 'MH01AB1234'
    },
    {
      id: 4,
      ride_id: 'R004',
      pickup_location: 'Airport Terminal 1',
      destination: 'Worli Sea Face',
      ride_type: 'car',
      status: 'requested',
      estimated_fare: '35.00',
      final_fare: null,
      created_at: '2025-07-23T22:15:24.000Z',
      completed_at: null,
      driver_name: null,
      make: null,
      model: null,
      plate_number: null
    }
  ];

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Setup localStorage mocks
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      const store: { [key: string]: string } = {
        'userId': '3',
        'userName': 'Priya Sharma',
        'userEmail': 'priya@example.com',
        'userType': 'rider'
      };
      return store[key] || null;
    });

    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule, 
        HttpClientTestingModule, 
        RiderDashboardComponent
      ],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RiderDashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.activeTab).toBe('book');
      expect(component.isSearching).toBeFalsy();
      expect(component.isBooking).toBeFalsy();
      expect(component.isLoading).toBeFalsy();
      expect(component.bookingForm).toBeDefined();
    });

    it('should load user profile from localStorage', () => {
      component.ngOnInit();
      
      expect(component.currentUser.id).toBe('3');
      expect(component.currentUser.name).toBe('Priya Sharma');
      expect(component.currentUser.email).toBe('priya@example.com');
    });

    it('should redirect to sign-in if no user data', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      component.ngOnInit();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sign-in']);
    });

    it('should load rider data and rides on initialization', () => {
      component.ngOnInit();

      // Should request rider data by email
      const riderReq = httpMock.expectOne('http://localhost:3000/api/rider/email/priya@example.com');
      expect(riderReq.request.method).toBe('GET');
      riderReq.flush({ message: 'Rider retrieved', data: mockRiderData });

      // Should request rider's rides
      const ridesReq = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      expect(ridesReq.request.method).toBe('GET');
      ridesReq.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });

      expect(component.riderData).toEqual(mockRiderData);
      expect(component.riderId).toBe(3);
      expect(component.currentUser.phoneNumber).toBe('+1234567892');
      expect(component.rideHistory.length).toBe(1); // Only completed rides in history
    });

    it('should handle error when loading rider data', () => {
      spyOn(console, 'error');
      
      component.ngOnInit();

      const riderReq = httpMock.expectOne('http://localhost:3000/api/rider/email/priya@example.com');
      riderReq.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sign-in']);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      component.riderData = mockRiderData;
      component.riderId = 3;
    });

    it('should switch tabs correctly', () => {
      component.setActiveTab('current');
      expect(component.activeTab).toBe('current');

      component.setActiveTab('history');
      expect(component.activeTab).toBe('history');

      component.setActiveTab('book');
      expect(component.activeTab).toBe('book');
    });

    it('should refresh data when switching to current tab', () => {
      component.setActiveTab('current');

      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      expect(req.request.method).toBe('GET');
      req.flush({ message: 'Rider rides retrieved', count: 1, data: [mockRideHistory[1]] });
    });

    it('should refresh data when switching to history tab', () => {
      component.setActiveTab('history');

      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      expect(req.request.method).toBe('GET');
      req.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });
    });
  });

  describe('Current Ride Management', () => {
    beforeEach(() => {
      component.riderData = mockRiderData;
      component.riderId = 3;
    });

    it('should identify active ride from API data', () => {
      component.setActiveTab('current');

      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      req.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });

      expect(component.currentRide).toBeTruthy();
      expect(component.currentRide?.rideId).toBe('R004');
      expect(component.currentRide?.status).toBe('requested');
      expect(component.activeTab).toBe('current');
    });

    it('should set no current ride when no active rides exist', () => {
      component.setActiveTab('current');

      const completedRides = mockRideHistory.filter(ride => ride.status === 'completed');
      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      req.flush({ message: 'Rider rides retrieved', count: 1, data: completedRides });

      expect(component.currentRide).toBeNull();
    });

    it('should cancel ride with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Set up a current ride
      component.currentRide = {
        rideId: 'R004',
        status: 'requested',
        driver: { id: '', name: 'Looking for driver...', carModel: '', plateNumber: '', rating: 0 },
        eta: 'Searching...',
        fare: 35,
        pickup: 'Airport Terminal 1',
        destination: 'Worli Sea Face'
      };

      component.cancelRide();

      expect(component.currentRide).toBeNull();
      expect(window.alert).toHaveBeenCalledWith('Ride cancelled successfully!');

      // Should refresh ride history
      const historyReq = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      historyReq.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });
    });

    it('should not cancel ride without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.currentRide = {
        rideId: 'R004',
        status: 'requested',
        driver: { id: '', name: 'Looking for driver...', carModel: '', plateNumber: '', rating: 0 },
        eta: 'Searching...',
        fare: 35,
        pickup: 'Airport Terminal 1',
        destination: 'Worli Sea Face'
      };

      component.cancelRide();

      expect(window.confirm).toHaveBeenCalled();
      expect(component.currentRide).not.toBeNull();
    });
  });

  describe('Ride History', () => {
    beforeEach(() => {
      component.riderData = mockRiderData;
      component.riderId = 3;
    });

    it('should filter and map ride history correctly', () => {
      component.setActiveTab('history');

      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      req.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });

      expect(component.rideHistory.length).toBe(1); // Only completed rides
      expect(component.rideHistory[0].rideId).toBe('R001');
      expect(component.rideHistory[0].status).toBe('completed');
      expect(component.rideHistory[0].driverName).toBe('Rajesh Kumar');
      expect(component.rideHistory[0].fare).toBe(18);
    });

    it('should view ride details', () => {
      spyOn(window, 'alert');
      const ride = {
        rideId: 'R001',
        pickup: 'Location A',
        destination: 'Location B',
        date: '2024-01-14T15:30:00Z',
        driverName: 'Test Driver',
        fare: 15,
        status: 'completed' as const
      };

      component.viewRideDetails(ride);

      expect(window.alert).toHaveBeenCalledWith('Viewing details for ride R001');
    });

    it('should rate completed ride', () => {
      spyOn(window, 'prompt').and.returnValues('5', 'Great ride!');
      spyOn(window, 'alert');

      const ride = {
        rideId: 'R001',
        pickup: 'Location A',
        destination: 'Location B',
        date: '2024-01-14T15:30:00Z',
        driverName: 'Test Driver',
        fare: 15,
        status: 'completed' as const
      };

      component.rateRide(ride);

      // Check that rating was assigned to the ride object
      expect((ride as any).rating).toBe(5);
      expect(window.alert).toHaveBeenCalledWith('Thank you for your feedback!');
    });

    it('should not rate non-completed ride', () => {
      spyOn(window, 'prompt');

      const ride = {
        rideId: 'R001',
        pickup: 'Location A',
        destination: 'Location B',
        date: '2024-01-14T15:30:00Z',
        driverName: 'Test Driver',
        fare: 15,
        status: 'cancelled' as const
      };

      component.rateRide(ride);

      expect(window.prompt).not.toHaveBeenCalled();
    });
  });

  describe('Booking Form', () => {
    beforeEach(() => {
      component.riderData = mockRiderData;
      component.riderId = 3;
    });

    it('should validate form correctly', () => {
      expect(component.bookingForm.valid).toBeFalsy();
      expect(component.isBookingFormValid).toBeFalsy();

      component.bookingForm.patchValue({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination',
        rideType: 'car',
        when: 'now'
      });

      // Still invalid without selected locations
      expect(component.isBookingFormValid).toBeFalsy();

      // Set selected locations
      component.selectedPickupLocation = {
        display_name: 'Test Pickup',
        lat: '40.7128',
        lon: '-74.0060',
        place_id: '1'
      };
      component.selectedDestinationLocation = {
        display_name: 'Test Destination',
        lat: '40.7589',
        lon: '-73.9851',
        place_id: '2'
      };

      expect(component.isBookingFormValid).toBeTruthy();
    });

    it('should not allow ride request without valid locations', () => {
      spyOn(window, 'alert');
      
      component.bookingForm.patchValue({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination'
      });

      component.findRides();

      expect(window.alert).toHaveBeenCalledWith('Please select valid pickup and destination locations from the suggestions.');
    });

    it('should request ride successfully', fakeAsync(() => {
      component.bookingForm.patchValue({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination',
        rideType: 'car',
        when: 'now'
      });

      component.selectedPickupLocation = {
        display_name: 'Test Pickup',
        lat: '40.7128',
        lon: '-74.0060',
        place_id: '1'
      };
      component.selectedDestinationLocation = {
        display_name: 'Test Destination',
        lat: '40.7589',
        lon: '-73.9851',
        place_id: '2'
      };

      spyOn(window, 'alert');

      component.findRides();

      expect(component.isSearching).toBeTruthy();

      tick(2000); // Wait for simulated request

      expect(component.isSearching).toBeFalsy();
      expect(window.alert).toHaveBeenCalledWith('Ride requested successfully! Looking for available drivers...');
      expect(component.currentRide).toBeTruthy();
      expect(component.activeTab).toBe('current');
    }));
  });

  describe('Location Autocomplete', () => {
    beforeEach(() => {
      component.riderData = mockRiderData;
      component.riderId = 3;
    });

    it('should search locations when input changes', fakeAsync(() => {
      const mockSuggestions = [
        {
          display_name: 'Mumbai, Maharashtra, India',
          lat: '19.0760',
          lon: '72.8777',
          place_id: '1'
        }
      ];

      // Initialize autocomplete
      component['setupLocationAutocomplete']();

      component.bookingForm.get('pickupLocation')?.setValue('Mumbai');
      tick(300); // debounce time

      const req = httpMock.expectOne(req => 
        req.url.includes('api.locationiq.com/v1/autocomplete') && 
        req.url.includes('q=Mumbai')
      );
      req.flush(mockSuggestions);

      expect(component.pickupSuggestions).toEqual(mockSuggestions);
      expect(component.showPickupSuggestions).toBeTruthy();
    }));

    it('should select pickup location from suggestions', () => {
      const suggestion = {
        display_name: 'Test Location',
        lat: '40.7128',
        lon: '-74.0060',
        place_id: '1'
      };

      component.selectPickupLocation(suggestion);

      expect(component.selectedPickupLocation).toEqual(suggestion);
      expect(component.bookingForm.get('pickupLocation')?.value).toBe('Test Location');
      expect(component.showPickupSuggestions).toBeFalsy();
    });

    it('should clear pickup location', () => {
      component.selectedPickupLocation = {
        display_name: 'Test',
        lat: '1',
        lon: '1',
        place_id: '1'
      };
      component.bookingForm.get('pickupLocation')?.setValue('Test');

      component.clearPickupLocation();

      expect(component.selectedPickupLocation).toBeNull();
      expect(component.bookingForm.get('pickupLocation')?.value).toBe('');
      expect(component.pickupSuggestions).toEqual([]);
    });
  });

  describe('Data Refresh', () => {
    beforeEach(() => {
      component.riderData = mockRiderData;
      component.riderId = 3;
    });

    it('should refresh current ride data', fakeAsync(() => {
      component.activeTab = 'current';
      component.refreshData();

      expect(component.isLoading).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      req.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });

      tick(1000); // loading delay

      expect(component.isLoading).toBeFalsy();
    }));

    it('should refresh ride history data', fakeAsync(() => {
      component.activeTab = 'history';
      component.refreshData();

      expect(component.isLoading).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:3000/api/rider/3/rides');
      req.flush({ message: 'Rider rides retrieved', count: 2, data: mockRideHistory });

      tick(1000); // loading delay

      expect(component.isLoading).toBeFalsy();
    }));
  });

  describe('Utility Functions', () => {
    it('should format date correctly', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should get status display text', () => {
      const statusTests = [
        { status: 'requested', expected: 'Looking for Driver' },
        { status: 'accepted', expected: 'Driver Assigned' },
        { status: 'driver_on_way', expected: 'Driver On The Way' },
        { status: 'rider_picked_up', expected: 'In Progress' },
        { status: 'completed', expected: 'Completed' },
        { status: 'cancelled', expected: 'Cancelled' },
        { status: 'unknown', expected: 'unknown' }
      ];

      statusTests.forEach(test => {
        expect(component.getStatusDisplayText(test.status)).toBe(test.expected);
      });
    });

    it('should get status CSS class', () => {
      const statusTests = [
        { status: 'requested', expected: 'status-requested' },
        { status: 'accepted', expected: 'status-accepted' },
        { status: 'driver_on_way', expected: 'status-on-way' },
        { status: 'rider_picked_up', expected: 'status-in-progress' },
        { status: 'completed', expected: 'status-completed' },
        { status: 'cancelled', expected: 'status-cancelled' },
        { status: 'unknown', expected: '' }
      ];

      statusTests.forEach(test => {
        expect(component.getStatusClass(test.status)).toBe(test.expected);
      });
    });

    it('should check if ride can be cancelled', () => {
      const testCases = [
        { status: 'requested', canCancel: true },
        { status: 'accepted', canCancel: true },
        { status: 'driver_on_way', canCancel: true },
        { status: 'rider_picked_up', canCancel: false },
        { status: 'completed', canCancel: false },
        { status: 'cancelled', canCancel: false }
      ];

      testCases.forEach(testCase => {
        const ride = {
          rideId: 'R001',
          status: testCase.status,
          driver: { id: '1', name: 'Test', carModel: 'Test', plateNumber: 'Test', rating: 5 },
          eta: '5 mins',
          fare: 15,
          pickup: 'A',
          destination: 'B'
        };
        expect(component.canCancelRide(ride)).toBe(testCase.canCancel);
      });
    });
  });

  describe('Logout', () => {
    it('should logout with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('userToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userId');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userName');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userEmail');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userType');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/register']);
    });

    it('should not logout without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.logout();

      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('API Data Mapping', () => {
    it('should map API ride data to CurrentRide correctly', () => {
      // Create a properly typed API ride object
      const apiRide: any = {
        ...mockRideHistory[1], // The requested ride
        final_fare: null // Explicitly set to null as it can be in API
      };
      
      const mappedRide = component['mapApiRideToCurrentRide'](apiRide);

      expect(mappedRide.rideId).toBe('R004');
      expect(mappedRide.status).toBe('requested');
      expect(mappedRide.pickup).toBe('Airport Terminal 1');
      expect(mappedRide.destination).toBe('Worli Sea Face');
      expect(mappedRide.fare).toBe(35);
      expect(mappedRide.driver.name).toBe('Driver Not Assigned');
    });

    it('should map API ride data to RideHistory correctly', () => {
      // Create a properly typed API ride object
      const apiRide: any = {
        ...mockRideHistory[0], // The completed ride
        final_fare: '18.00' // Ensure it's a string
      };
      
      const mappedRide = component['mapApiRideToRideHistory'](apiRide);

      expect(mappedRide.rideId).toBe('R001');
      expect(mappedRide.status).toBe('completed');
      expect(mappedRide.pickup).toBe('Bandra West Railway Station');
      expect(mappedRide.destination).toBe('Andheri East Metro Station');
      expect(mappedRide.fare).toBe(18);
      expect(mappedRide.driverName).toBe('Rajesh Kumar');
      expect(mappedRide.driver?.vehicle).toBe('Honda City');
    });

    it('should handle null final_fare in API data', () => {
      const apiRideWithNullFare: any = {
        ...mockRideHistory[1],
        final_fare: null,
        estimated_fare: '25.00'
      };
      
      const mappedRide = component['mapApiRideToCurrentRide'](apiRideWithNullFare);
      expect(mappedRide.fare).toBe(25); // Should fall back to estimated_fare
    });

    it('should handle missing driver data in API', () => {
      const apiRideWithoutDriver: any = {
        ...mockRideHistory[0],
        driver_name: null,
        make: null,
        model: null,
        plate_number: null
      };
      
      const mappedRide = component['mapApiRideToRideHistory'](apiRideWithoutDriver);
      expect(mappedRide.driverName).toBe('N/A');
      expect(mappedRide.driver).toBeUndefined();
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup subscriptions on destroy', () => {
      component.riderData = mockRiderData;
      component.riderId = 3;
      component.ngOnInit();
      
      // Mock the HTTP requests
      httpMock.expectOne('http://localhost:3000/api/rider/email/priya@example.com').flush({ data: mockRiderData });
      httpMock.expectOne('http://localhost:3000/api/rider/3/rides').flush({ data: mockRideHistory });

      // Add some subscriptions
      expect(component['subscriptions'].length).toBeGreaterThan(0);

      // Spy on unsubscribe
      const unsubscribeSpies = component['subscriptions'].map(sub => spyOn(sub, 'unsubscribe'));

      component.ngOnDestroy();

      unsubscribeSpies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should stop polling on destroy', () => {
      component.riderData = mockRiderData;
      component.riderId = 3;
      component.ngOnInit();
      
      // Mock initial requests
      httpMock.expectOne('http://localhost:3000/api/rider/email/priya@example.com').flush({ data: mockRiderData });
      httpMock.expectOne('http://localhost:3000/api/rider/3/rides').flush({ data: mockRideHistory });

      expect(component['currentRidePolling']).toBeTruthy();

      const pollingSpy = spyOn(component['currentRidePolling']!, 'unsubscribe');

      component.ngOnDestroy();

      expect(pollingSpy).toHaveBeenCalled();
    });
  });
});