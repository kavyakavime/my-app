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
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+1234567890'
  };

  const mockCurrentRide = {
    rideId: 'R001',
    status: 'driver_on_way',
    driver: {
      id: 'driver1',
      name: 'John Driver',
      carModel: 'Honda City',
      plateNumber: 'ABC123',
      rating: 4.8,
      phone: '+1987654321'
    },
    eta: '5 mins',
    fare: 12,
    pickup: 'Test Pickup Location',
    destination: 'Test Destination',
    otp: '1234',
    requestedAt: '2024-01-15T10:00:00Z'
  };

  const mockRideHistory = [
    {
      rideId: 'R002',
      pickup: 'Location A',
      destination: 'Location B',
      date: '2024-01-14T15:30:00Z',
      driverName: 'Jane Driver',
      fare: 15,
      status: 'completed' as const,
      rating: 5,
      driver: {
        name: 'Jane Driver',
        vehicle: 'Toyota Camry',
        plateNumber: 'XYZ789'
      }
    },
    {
      rideId: 'R003',
      pickup: 'Location C',
      destination: 'Location D',
      date: '2024-01-13T09:15:00Z',
      driverName: 'Bob Driver',
      fare: 8,
      status: 'cancelled' as const
    }
  ];

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Setup localStorage mocks
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      const store: { [key: string]: string } = {
        'userId': '1',
        'userName': 'Test User',
        'userEmail': 'test@example.com',
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
      
      expect(component.currentUser.id).toBe('1');
      expect(component.currentUser.name).toBe('Test User');
      expect(component.currentUser.email).toBe('test@example.com');
    });

    it('should redirect to sign-in if no user data', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      component.ngOnInit();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sign-in']);
    });

    it('should make API calls on initialization', () => {
      component.ngOnInit();

      // Should request profile
      const profileReq = httpMock.expectOne('http://localhost:3000/api/rider/profile');
      expect(profileReq.request.method).toBe('GET');
      profileReq.flush({ profile: { phoneNumber: '+1234567890' } });

      // Should request current ride
      const currentRideReq = httpMock.expectOne('http://localhost:3000/api/rider/rides/current');
      expect(currentRideReq.request.method).toBe('GET');
      currentRideReq.flush({ currentRide: null });

      // Should request ride history
      const historyReq = httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20');
      expect(historyReq.request.method).toBe('GET');
      historyReq.flush({ rides: mockRideHistory });

      expect(component.rideHistory).toEqual(mockRideHistory);
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
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

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/current');
      expect(req.request.method).toBe('GET');
      req.flush({ currentRide: mockCurrentRide });
    });

    it('should refresh data when switching to history tab', () => {
      component.setActiveTab('history');

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20');
      expect(req.request.method).toBe('GET');
      req.flush({ rides: mockRideHistory });
    });
  });

  describe('Booking Form', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
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
      httpMock.expectNone('http://localhost:3000/api/rider/rides/request');
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

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/request');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination',
        rideType: 'car',
        when: 'now'
      });

      req.flush({ ride: { rideId: 'R001' } });

      expect(component.isSearching).toBeFalsy();
      expect(window.alert).toHaveBeenCalledWith('Ride requested successfully! Looking for available drivers...');

      // Should load current ride and switch tabs
      const currentRideReq = httpMock.expectOne('http://localhost:3000/api/rider/rides/current');
      currentRideReq.flush({ currentRide: mockCurrentRide });

      expect(component.activeTab).toBe('current');
    }));

    it('should handle ride request error', () => {
      component.bookingForm.patchValue({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination'
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

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/request');
      req.flush({ message: 'Error message' }, { status: 400, statusText: 'Bad Request' });

      expect(component.isSearching).toBeFalsy();
      expect(window.alert).toHaveBeenCalledWith('Failed to request ride. Please try again.');
    });
  });

  describe('Current Ride Management', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: mockCurrentRide });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
      
      component.currentRide = mockCurrentRide;
    });

    it('should load current ride correctly', () => {
      expect(component.currentRide).toEqual(mockCurrentRide);
      expect(component.hasCurrentRide).toBeTruthy();
    });

    it('should switch to current tab when active ride exists', () => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: mockCurrentRide });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });

      expect(component.activeTab).toBe('current');
    });

    it('should cancel ride with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      component.cancelRide();

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/R001/cancel');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Cancelled by rider' });

      req.flush({ message: 'Ride cancelled successfully' });

      expect(component.currentRide).toBeNull();
      expect(window.alert).toHaveBeenCalledWith('Ride cancelled successfully!');

      // Should refresh ride history
      const historyReq = httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20');
      historyReq.flush({ rides: mockRideHistory });
    });

    it('should not cancel ride without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.cancelRide();

      expect(window.confirm).toHaveBeenCalled();
      httpMock.expectNone('http://localhost:3000/api/rider/rides/R001/cancel');
    });

    it('should call driver', () => {
      spyOn(window, 'alert');

      component.callDriver();

      expect(window.alert).toHaveBeenCalledWith('Calling John Driver...');
    });

    it('should message driver', () => {
      spyOn(window, 'alert');

      component.messageDriver();

      expect(window.alert).toHaveBeenCalledWith('Opening chat with John Driver...');
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
        const ride = { ...mockCurrentRide, status: testCase.status };
        expect(component.canCancelRide(ride)).toBe(testCase.canCancel);
      });
    });
  });

  describe('Ride History', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: mockRideHistory });
    });

    it('should load ride history correctly', () => {
      expect(component.rideHistory).toEqual(mockRideHistory);
      expect(component.hasRideHistory).toBeTruthy();
    });

    it('should view ride details', () => {
      spyOn(window, 'alert');
      const ride = mockRideHistory[0];

      component.viewRideDetails(ride);

      expect(window.alert).toHaveBeenCalledWith('Viewing details for ride R002');
    });

    it('should rate completed ride', () => {
      spyOn(window, 'prompt').and.returnValues('5', 'Great ride!');
      spyOn(window, 'alert');

      const ride = mockRideHistory[0]; // completed ride
      component.rateRide(ride);

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/R002/rate');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        rating: 5,
        comment: 'Great ride!'
      });

      req.flush({ message: 'Rating submitted successfully' });

      expect(ride.rating).toBe(5);
      expect(window.alert).toHaveBeenCalledWith('Thank you for your feedback!');
    });

    it('should not rate non-completed ride', () => {
      spyOn(window, 'prompt');

      const ride = { ...mockRideHistory[1], status: 'cancelled' as const };
      component.rateRide(ride);

      expect(window.prompt).not.toHaveBeenCalled();
      httpMock.expectNone('http://localhost:3000/api/rider/rides/R003/rate');
    });

    it('should check if ride can be rated', () => {
      const completedRide = { ...mockRideHistory[0], rating: undefined };
      const completedRatedRide = { ...mockRideHistory[0], rating: 5 };
      const cancelledRide = { ...mockRideHistory[1], status: 'cancelled' as const };

      expect(component.canRateRide(completedRide)).toBeTruthy();
      expect(component.canRateRide(completedRatedRide)).toBeFalsy();
      expect(component.canRateRide(cancelledRide)).toBeFalsy();
    });
  });

  describe('Location Autocomplete', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
    });

    it('should search locations when input changes', fakeAsync(() => {
      const mockSuggestions = [
        {
          display_name: 'New York, NY, USA',
          lat: '40.7128',
          lon: '-74.0060',
          place_id: '1'
        }
      ];

      component.bookingForm.get('pickupLocation')?.setValue('New York');
      tick(300); // debounce time

      const req = httpMock.expectOne(req => 
        req.url.includes('api.locationiq.com/v1/autocomplete') && 
        req.url.includes('q=New%20York')
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

    it('should select destination location from suggestions', () => {
      const suggestion = {
        display_name: 'Test Destination',
        lat: '40.7589',
        lon: '-73.9851',
        place_id: '2'
      };

      component.selectDestinationLocation(suggestion);

      expect(component.selectedDestinationLocation).toEqual(suggestion);
      expect(component.bookingForm.get('destination')?.value).toBe('Test Destination');
      expect(component.showDestinationSuggestions).toBeFalsy();
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

    it('should clear destination location', () => {
      component.selectedDestinationLocation = {
        display_name: 'Test',
        lat: '1',
        lon: '1',
        place_id: '1'
      };
      component.bookingForm.get('destination')?.setValue('Test');

      component.clearDestinationLocation();

      expect(component.selectedDestinationLocation).toBeNull();
      expect(component.bookingForm.get('destination')?.value).toBe('');
      expect(component.destinationSuggestions).toEqual([]);
    });

    it('should handle keyboard events', () => {
      const suggestions = [
        {
          display_name: 'Test Location',
          lat: '40.7128',
          lon: '-74.0060',
          place_id: '1'
        }
      ];
      component.pickupSuggestions = suggestions;

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(enterEvent, 'preventDefault');
      spyOn(component, 'selectPickupLocation');

      component.onInputKeydown(enterEvent, 'pickup');

      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(component.selectPickupLocation).toHaveBeenCalledWith(suggestions[0]);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onInputKeydown(escapeEvent, 'pickup');

      expect(component.showPickupSuggestions).toBeFalsy();
    });
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

    it('should reset booking form correctly', () => {
      // Set some values first
      component.bookingForm.patchValue({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination',
        rideType: 'bike'
      });
      component.selectedPickupLocation = { display_name: 'Test', lat: '1', lon: '1', place_id: '1' };
      component.availableRides = [{ id: '1', driverName: 'Test', carModel: 'Test', plateNumber: 'Test', rating: 5, eta: '5 mins', price: 10 }];

      component.resetBookingForm();

      expect(component.bookingForm.get('pickupLocation')?.value).toBe('');
      expect(component.bookingForm.get('destination')?.value).toBe('');
      expect(component.bookingForm.get('rideType')?.value).toBe('car');
      expect(component.bookingForm.get('when')?.value).toBe('now');
      expect(component.selectedPickupLocation).toBeNull();
      expect(component.selectedDestinationLocation).toBeNull();
      expect(component.availableRides).toEqual([]);
    });
  });

  describe('Data Refresh', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
    });

    it('should refresh current ride data', fakeAsync(() => {
      component.activeTab = 'current';
      component.refreshData();

      expect(component.isLoading).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/current');
      req.flush({ currentRide: mockCurrentRide });

      tick(1000); // loading delay

      expect(component.isLoading).toBeFalsy();
    }));

    it('should refresh ride history data', fakeAsync(() => {
      component.activeTab = 'history';
      component.refreshData();

      expect(component.isLoading).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20');
      req.flush({ rides: mockRideHistory });

      tick(1000); // loading delay

      expect(component.isLoading).toBeFalsy();
    }));
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

  describe('Component Lifecycle', () => {
    it('should cleanup subscriptions on destroy', () => {
      component.ngOnInit();
      
      // Mock the HTTP requests
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });

      // Add some subscriptions
      expect(component['subscriptions'].length).toBeGreaterThan(0);

      // Spy on unsubscribe
      const unsubscribeSpies = component['subscriptions'].map(sub => spyOn(sub, 'unsubscribe'));

      component.ngOnDestroy();

      unsubscribeSpies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', () => {
      spyOn(console, 'error');

      component.ngOnInit();

      // Make API calls fail
      const profileReq = httpMock.expectOne('http://localhost:3000/api/rider/profile');
      profileReq.flush('Error', { status: 500, statusText: 'Server Error' });

      const currentRideReq = httpMock.expectOne('http://localhost:3000/api/rider/rides/current');
      currentRideReq.flush('Error', { status: 500, statusText: 'Server Error' });

      const historyReq = httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20');
      historyReq.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(console.error).toHaveBeenCalledTimes(2); // current ride and history errors logged
      expect(component.currentRide).toBeNull();
      expect(component.rideHistory).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
    });

    it('should handle empty responses', () => {
      component.setActiveTab('current');

      const req = httpMock.expectOne('http://localhost:3000/api/rider/rides/current');
      req.flush({});

      expect(component.currentRide).toBeNull();
    });

    it('should handle invalid rating input', () => {
      spyOn(window, 'prompt').and.returnValue('invalid');
      spyOn(window, 'alert');

      const ride = mockRideHistory[0];
      component.rateRide(ride);

      expect(window.alert).not.toHaveBeenCalled();
      httpMock.expectNone('http://localhost:3000/api/rider/rides/R002/rate');
    });

    it('should handle null rating input', () => {
      spyOn(window, 'prompt').and.returnValue(null);

      const ride = mockRideHistory[0];
      component.rateRide(ride);

      httpMock.expectNone('http://localhost:3000/api/rider/rides/R002/rate');
    });

    it('should prevent multiple simultaneous requests', () => {
      component.bookingForm.patchValue({
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination'
      });
      component.selectedPickupLocation = { display_name: 'Test', lat: '1', lon: '1', place_id: '1' };
      component.selectedDestinationLocation = { display_name: 'Test', lat: '1', lon: '1', place_id: '1' };

      component.isSearching = true;
      component.findRides();

      httpMock.expectNone('http://localhost:3000/api/rider/rides/request');
    });

    it('should handle form submission with invalid form', () => {
      spyOn(window, 'alert');

      component.findRides();

      expect(window.alert).toHaveBeenCalledWith('Please select valid pickup and destination locations from the suggestions.');
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
      httpMock.expectOne('http://localhost:3000/api/rider/profile').flush({});
      httpMock.expectOne('http://localhost:3000/api/rider/rides/current').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/rider/rides/history?limit=20').flush({ rides: [] });
      fixture.detectChanges();
    });

    it('should display correct tab content', () => {
      // Test Book Ride tab
      component.setActiveTab('book');
      fixture.detectChanges();

      let bookTab = fixture.nativeElement.querySelector('.book-ride-panel');
      let currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
      let historyTab = fixture.nativeElement.querySelector('.ride-history-panel');

      expect(bookTab).toBeTruthy();
      expect(currentTab).toBeFalsy();
      expect(historyTab).toBeFalsy();

      // Test Current Ride tab
      component.setActiveTab('current');
      fixture.detectChanges();

      bookTab = fixture.nativeElement.querySelector('.book-ride-panel');
      currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
      historyTab = fixture.nativeElement.querySelector('.ride-history-panel');

      expect(bookTab).toBeFalsy();
      expect(currentTab).toBeTruthy();
      expect(historyTab).toBeFalsy();

      // Test Ride History tab
      component.setActiveTab('history');
      fixture.detectChanges();

      bookTab = fixture.nativeElement.querySelector('.book-ride-panel');
      currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
      historyTab = fixture.nativeElement.querySelector('.ride-history-panel');

      expect(bookTab).toBeFalsy();
      expect(currentTab).toBeFalsy();
      expect(historyTab).toBeTruthy();
    });

    it('should show notification badge when current ride exists', () => {
      component.currentRide = mockCurrentRide;
      fixture.detectChanges();

      const notificationBadge = fixture.nativeElement.querySelector('.notification-badge');
      expect(notificationBadge).toBeTruthy();
    });

    it('should show count badge for ride history', () => {
      component.rideHistory = mockRideHistory;
      fixture.detectChanges();

      const countBadge = fixture.nativeElement.querySelector('.count-badge');
      expect(countBadge).toBeTruthy();
      expect(countBadge.textContent.trim()).toBe('2');
    });

    it('should disable booking form when current ride exists', () => {
      component.currentRide = mockCurrentRide;
      fixture.detectChanges();

      const bookingForm = fixture.nativeElement.querySelector('.booking-form');
      expect(bookingForm.classList).toContain('disabled');

      const submitButton = fixture.nativeElement.querySelector('.find-rides-btn');
      expect(submitButton.disabled).toBeTruthy();
      expect(submitButton.textContent.trim()).toBe('Complete Current Ride First');
    });
  });
});