import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DriverDashboardComponent } from './driverDashboard.component';
import { DriverService } from '../services/driver.service';
import { of, throwError } from 'rxjs';

describe('DriverDashboardComponent', () => {
  let component: DriverDashboardComponent;
  let fixture: ComponentFixture<DriverDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let httpMock: HttpTestingController;
  let driverService: DriverService;

  const mockDriver = {
    id: 1,
    user_id: 4,
    full_name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone_number: '+919876543210',
    license_number: 'DL12345678',
    current_location_address: 'Bandra West, Mumbai',
    is_available: true,
    is_verified: true,
    rating: '4.80',
    total_rides: 245,
    total_earnings: '3650.50',
    created_at: '2025-07-23T22:15:24.000Z',
    make: 'Honda',
    model: 'City',
    plate_number: 'MH01AB1234',
    vehicle_type: 'car',
    color: 'White',
    year: 2020
  };

  const mockRides = [
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
      rider_name: 'Alex Smith'
    }
  ];

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Setup localStorage mocks
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      const store: { [key: string]: string } = {
        'userEmail': 'rajesh@example.com',
        'userName': 'Rajesh Kumar',
        'userId': '4',
        'userType': 'driver'
      };
      return store[key] || null;
    });

    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule, 
        FormsModule,
        HttpClientTestingModule, 
        DriverDashboardComponent
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        DriverService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DriverDashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    httpMock = TestBed.inject(HttpTestingController);
    driverService = TestBed.inject(DriverService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.activeTab).toBe('requests');
      expect(component.isAvailable).toBeTruthy();
      expect(component.isProcessing).toBeFalsy();
      expect(component.isLoading).toBeTruthy();
      expect(component.profileForm).toBeDefined();
      expect(component.vehicleForm).toBeDefined();
    });

    it('should redirect to sign-in if no user email', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      component.ngOnInit();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sign-in']);
    });

    it('should load driver data on initialization', fakeAsync(() => {
      component.ngOnInit();

      // Mock the driver data request
      const driverReq = httpMock.expectOne('http://localhost:3000/api/driver/email/rajesh@example.com');
      expect(driverReq.request.method).toBe('GET');
      driverReq.flush({ message: 'Driver retrieved', data: mockDriver });

      // Mock the rides request
      const ridesReq = httpMock.expectOne('http://localhost:3000/api/driver/1/rides');
      expect(ridesReq.request.method).toBe('GET');
      ridesReq.flush({ message: 'Driver rides retrieved', count: 1, data: mockRides });

      // Mock current ride request
      const currentRideReq = httpMock.expectOne('http://localhost:3000/api/driver/current-ride');
      currentRideReq.flush({ currentRide: null });

      // Mock earnings request
      const earningsReq = httpMock.expectOne('http://localhost:3000/api/driver/earnings');
      earningsReq.flush({ earnings: { today: 128, thisWeek: 845, thisMonth: 2346 } });

      tick();

      expect(component.currentDriver).toEqual(mockDriver);
      expect(component.isLoading).toBeFalsy();
      expect(component.driverStats.rating).toBe(4.8);
      expect(component.driverStats.totalRides).toBe(245);
      expect(component.rideHistory.length).toBe(1);
    }));

    it('should handle error when loading driver data', fakeAsync(() => {
      spyOn(console, 'error');
      
      component.ngOnInit();

      const driverReq = httpMock.expectOne('http://localhost:3000/api/driver/email/rajesh@example.com');
      driverReq.flush('Error', { status: 500, statusText: 'Server Error' });

      tick();

      expect(component.isLoading).toBeFalsy();
      expect(component.errorMessage).toBe('Failed to load driver data');
      expect(console.error).toHaveBeenCalled();
    }));
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      // Setup component with mock data
      component.currentDriver = mockDriver;
      component.isLoading = false;
    });

    it('should switch tabs correctly', () => {
      component.setActiveTab('current');
      expect(component.activeTab).toBe('current');

      component.setActiveTab('history');
      expect(component.activeTab).toBe('history');

      component.setActiveTab('profile');
      expect(component.activeTab).toBe('profile');
    });

    it('should load pending requests when switching to requests tab', () => {
      component.setActiveTab('requests');

      const req = httpMock.expectOne('http://localhost:3000/api/driver/ride-requests');
      expect(req.request.method).toBe('GET');
      req.flush({ requests: [] });
    });

    it('should load current ride when switching to current tab', () => {
      component.setActiveTab('current');

      const req = httpMock.expectOne('http://localhost:3000/api/driver/current-ride');
      expect(req.request.method).toBe('GET');
      req.flush({ currentRide: null });
    });

    it('should load ride history when switching to history tab', () => {
      component.setActiveTab('history');

      const req = httpMock.expectOne('http://localhost:3000/api/driver/1/rides');
      expect(req.request.method).toBe('GET');
      req.flush({ message: 'Driver rides retrieved', count: 1, data: mockRides });
    });
  });

  describe('Availability Toggle', () => {
    beforeEach(() => {
      component.currentDriver = mockDriver;
      component.isLoading = false;
    });

    it('should toggle availability successfully', () => {
      component.isAvailable = false;
      component.toggleAvailability();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/availability');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isAvailable: false });

      req.flush({ message: 'Driver went offline', isAvailable: false });

      expect(component.pendingRequests).toEqual([]);
    });

    it('should handle availability toggle error', () => {
      spyOn(console, 'error');
      const originalAvailability = component.isAvailable;
      
      component.toggleAvailability();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/availability');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(component.isAvailable).toBe(!originalAvailability); // Should revert
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Ride Request Management', () => {
    const mockRequest = {
      requestId: 'req1',
      rideId: 'R001',
      pickup: 'Location A',
      destination: 'Location B',
      rideType: 'car',
      estimatedFare: 15,
      estimatedEta: '5 mins',
      rider: { name: 'John Doe', phone: '+1234567890' },
      expiresAt: '2024-01-20T16:00:00Z'
    };

    beforeEach(() => {
      component.currentDriver = mockDriver;
      component.pendingRequests = [mockRequest];
    });

    it('should accept ride request successfully', () => {
      spyOn(window, 'alert');
      
      component.acceptRequest(mockRequest);

      expect(component.isProcessing).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/ride-requests/req1/accept');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Ride request accepted successfully' });

      // Mock current ride request after acceptance
      const currentRideReq = httpMock.expectOne('http://localhost:3000/api/driver/current-ride');
      currentRideReq.flush({ currentRide: { rideId: 'R001', status: 'accepted' } });

      expect(component.isProcessing).toBeFalsy();
      expect(component.pendingRequests.length).toBe(0);
      expect(component.activeTab).toBe('current');
      expect(window.alert).toHaveBeenCalledWith('Ride request accepted successfully!');
    });

    it('should decline ride request successfully', () => {
      spyOn(window, 'alert');
      
      component.declineRequest(mockRequest);

      expect(component.isProcessing).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/ride-requests/req1/decline');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Ride request declined' });

      expect(component.isProcessing).toBeFalsy();
      expect(component.pendingRequests.length).toBe(0);
      expect(window.alert).toHaveBeenCalledWith('Ride request declined.');
    });

    it('should not process requests when already processing', () => {
      component.isProcessing = true;
      
      component.acceptRequest(mockRequest);
      
      httpMock.expectNone('http://localhost:3000/api/driver/ride-requests/req1/accept');
    });

    it('should handle accept request error', () => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      
      component.acceptRequest(mockRequest);

      const req = httpMock.expectOne('http://localhost:3000/api/driver/ride-requests/req1/accept');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(component.isProcessing).toBeFalsy();
      expect(window.alert).toHaveBeenCalledWith('Failed to accept ride request. Please try again.');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Current Ride Management', () => {
    const mockCurrentRide = {
      rideId: 'R001',
      pickup: 'Location A',
      destination: 'Location B',
      status: 'rider_picked_up',
      fare: 15,
      otp: '1234',
      rider: { name: 'John Doe', phone: '+1234567890' },
      acceptedAt: '2024-01-20T15:00:00Z'
    };

    beforeEach(() => {
      component.currentDriver = mockDriver;
      component.currentRide = mockCurrentRide;
    });

    it('should complete ride successfully', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      
      component.completeRide();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/current-ride/complete');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Ride completed successfully' });

      // Mock subsequent requests
      const ridesReq = httpMock.expectOne('http://localhost:3000/api/driver/1/rides');
      ridesReq.flush({ data: mockRides });

      const earningsReq = httpMock.expectOne('http://localhost:3000/api/driver/earnings');
      earningsReq.flush({ earnings: { today: 128, thisWeek: 845, thisMonth: 2346 } });

      const driverReq = httpMock.expectOne('http://localhost:3000/api/driver/email/rajesh@example.com');
      driverReq.flush({ data: mockDriver });

      expect(component.currentRide).toBeNull();
      expect(window.alert).toHaveBeenCalledWith('Ride completed successfully!');
    });

    it('should not complete ride without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      component.completeRide();

      httpMock.expectNone('http://localhost:3000/api/driver/current-ride/complete');
    });

    it('should update ride status successfully', () => {
      spyOn(window, 'alert');
      
      component.updateRideStatus('driver_on_way');

      const req = httpMock.expectOne('http://localhost:3000/api/driver/current-ride/status');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'driver_on_way' });
      req.flush({ message: 'Ride status updated successfully' });

      // Mock current ride reload
      const currentRideReq = httpMock.expectOne('http://localhost:3000/api/driver/current-ride');
      currentRideReq.flush({ currentRide: mockCurrentRide });

      expect(window.alert).toHaveBeenCalledWith('Ride status updated successfully!');
    });

    it('should call rider', () => {
      spyOn(window, 'alert');
      
      component.callRider();
      
      expect(window.alert).toHaveBeenCalledWith('Calling John Doe...');
    });

    it('should message rider', () => {
      spyOn(window, 'alert');
      
      component.messageRider();
      
      expect(window.alert).toHaveBeenCalledWith('Opening chat with John Doe...');
    });

    it('should start navigation', () => {
      spyOn(window, 'alert');
      
      component.startNavigation();
      
      expect(window.alert).toHaveBeenCalledWith('Starting navigation to Location B...');
    });
  });

  describe('Profile Management', () => {
    beforeEach(() => {
      component.currentDriver = mockDriver;
      component.isLoading = false;
      fixture.detectChanges();
    });

    it('should update location successfully', () => {
      spyOn(window, 'alert');
      
      component.profileForm.patchValue({ currentLocation: 'New Location' });
      component.updateLocation();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/location');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ lat: 0, lng: 0, address: 'New Location' });
      req.flush({ message: 'Location updated successfully' });

      expect(window.alert).toHaveBeenCalledWith('Location updated successfully!');
      expect(component.currentDriver?.current_location_address).toBe('New Location');
    });

    it('should not update empty location', () => {
      spyOn(window, 'alert');
      
      component.profileForm.patchValue({ currentLocation: '' });
      component.updateLocation();

      expect(window.alert).toHaveBeenCalledWith('Please enter a valid location.');
      httpMock.expectNone('http://localhost:3000/api/driver/location');
    });

    it('should handle location update error', () => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      
      component.profileForm.patchValue({ currentLocation: 'New Location' });
      component.updateLocation();

      const req = httpMock.expectOne('http://localhost:3000/api/driver/location');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(window.alert).toHaveBeenCalledWith('Failed to update location. Please try again.');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should format date correctly', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should get status display text correctly', () => {
      expect(component.getStatusDisplayText('requested')).toBe('Requested');
      expect(component.getStatusDisplayText('accepted')).toBe('Accepted');
      expect(component.getStatusDisplayText('driver_on_way')).toBe('On The Way');
      expect(component.getStatusDisplayText('rider_picked_up')).toBe('In Progress');
      expect(component.getStatusDisplayText('completed')).toBe('Completed');
      expect(component.getStatusDisplayText('cancelled')).toBe('Cancelled');
      expect(component.getStatusDisplayText('unknown')).toBe('unknown');
    });

    it('should check boolean properties correctly', () => {
      component.pendingRequests = [{ requestId: '1' } as any];
      expect(component.hasPendingRequests).toBeTruthy();

      component.pendingRequests = [];
      expect(component.hasPendingRequests).toBeFalsy();

      component.currentRide = { rideId: 'R001' } as any;
      expect(component.hasCurrentRide).toBeTruthy();

      component.currentRide = null;
      expect(component.hasCurrentRide).toBeFalsy();

      component.rideHistory = [{ rideId: 'R001' } as any];
      expect(component.hasRideHistory).toBeTruthy();

      component.rideHistory = [];
      expect(component.hasRideHistory).toBeFalsy();
    });

    it('should get availability status correctly', () => {
      component.isAvailable = true;
      expect(component.availabilityStatus).toBe('Available');

      component.isAvailable = false;
      expect(component.availabilityStatus).toBe('Offline');
    });

    it('should clear error message', () => {
      component.errorMessage = 'Test error';
      component.clearError();
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Logout', () => {
    it('should logout with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('userToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('sessionToken');
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
      component.currentDriver = mockDriver;
      component.ngOnInit();
      
      // Mock the HTTP requests
      httpMock.expectOne('http://localhost:3000/api/driver/email/rajesh@example.com').flush({ data: mockDriver });
      httpMock.expectOne('http://localhost:3000/api/driver/1/rides').flush({ data: mockRides });
      httpMock.expectOne('http://localhost:3000/api/driver/current-ride').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/driver/earnings').flush({ earnings: {} });

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
      component.ngOnInit();
      
      // Mock initial requests
      httpMock.expectOne('http://localhost:3000/api/driver/email/rajesh@example.com').flush({ data: mockDriver });
      httpMock.expectOne('http://localhost:3000/api/driver/1/rides').flush({ data: mockRides });
      httpMock.expectOne('http://localhost:3000/api/driver/current-ride').flush({ currentRide: null });
      httpMock.expectOne('http://localhost:3000/api/driver/earnings').flush({ earnings: {} });

      expect(component['pollingSubscription']).toBeTruthy();

      const pollingSpy = spyOn(component['pollingSubscription']!, 'unsubscribe');

      component.ngOnDestroy();

      expect(pollingSpy).toHaveBeenCalled();
    });
  });

  describe('Emergency Actions', () => {
    it('should handle emergency', () => {
      spyOn(window, 'alert');

      component.emergency();

      expect(window.alert).toHaveBeenCalledWith('Emergency services contacted. Stay safe!');
    });

    it('should view ride details', () => {
      spyOn(window, 'alert');
      const mockRideHistory = {
        rideId: 'R001',
        pickup: 'A',
        destination: 'B',
        date: '2024-01-01',
        riderName: 'John',
        duration: '20 mins',
        fare: 15,
        rating: 5,
        status: 'completed'
      };

      component.viewRideDetails(mockRideHistory);

      expect(window.alert).toHaveBeenCalledWith('Viewing details for ride R001');
    });

    it('should view detailed report', () => {
      spyOn(window, 'alert');

      component.viewDetailedReport();

      expect(window.alert).toHaveBeenCalledWith('Opening detailed earnings report...');
    });
  });

  describe('Form Initialization', () => {
    beforeEach(() => {
      component.currentDriver = mockDriver;
    });

    it('should initialize forms with driver data', () => {
      component['initializeForms']();

      expect(component.profileForm.get('fullName')?.value).toBe('Rajesh Kumar');
      expect(component.profileForm.get('currentLocation')?.value).toBe('Bandra West, Mumbai');
      expect(component.vehicleForm.get('vehicleType')?.value).toBe('car');
      expect(component.vehicleForm.get('vehicleModel')?.value).toBe('Honda City');
      expect(component.vehicleForm.get('numberPlate')?.value).toBe('MH01AB1234');
    });

    it('should handle missing vehicle data gracefully', () => {
      const driverWithoutVehicle = {
        ...mockDriver,
        make: undefined,
        model: undefined,
        plate_number: undefined
      } as any;
      
      component.currentDriver = driverWithoutVehicle;
      component['initializeForms']();

      expect(component.vehicleForm.get('vehicleModel')?.value).toBe('');
      expect(component.vehicleForm.get('numberPlate')?.value).toBe('');
    });
  });

  describe('Stats Updates', () => {
    beforeEach(() => {
      component.currentDriver = mockDriver;
    });

    it('should update driver stats from loaded data', () => {
      component['updateDriverStats']();

      expect(component.driverStats.rating).toBe(4.8);
      expect(component.driverStats.totalRides).toBe(245);
      expect(component.driverStats.monthlyEarnings).toBe(3650.5);
    });

    it('should handle missing stats gracefully', () => {
      const driverWithoutStats = {
        ...mockDriver,
        rating: undefined,
        total_rides: undefined,
        total_earnings: undefined
      } as any;
      
      component.currentDriver = driverWithoutStats;
      component['updateDriverStats']();

      expect(component.driverStats.rating).toBe(0);
      expect(component.driverStats.totalRides).toBe(0);
      expect(component.driverStats.monthlyEarnings).toBe(0);
    });
  });

  describe('Duration Calculation', () => {
    it('should calculate duration correctly', () => {
      const start = '2024-01-01T10:00:00Z';
      const end = '2024-01-01T10:30:00Z';
      
      const duration = component['calculateDuration'](start, end);
      
      expect(duration).toBe('30 mins');
    });

    it('should return N/A for missing end date', () => {
      const start = '2024-01-01T10:00:00Z';
      
      const duration = component['calculateDuration'](start);
      
      expect(duration).toBe('N/A');
    });
  });

  describe('Error Handling', () => {
    it('should handle ride history loading error', () => {
      spyOn(console, 'error');
      component.currentDriver = mockDriver;
      
      component['loadDriverRides']();
      
      const req = httpMock.expectOne('http://localhost:3000/api/driver/1/rides');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle current ride loading error', () => {
      spyOn(console, 'error');
      
      component['loadCurrentRide']();
      
      const req = httpMock.expectOne('http://localhost:3000/api/driver/current-ride');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      
      expect(console.error).toHaveBeenCalled();
      expect(component.currentRide).toBeNull();
    });

    it('should handle earnings loading error', () => {
      spyOn(console, 'error');
      
      component['loadEarnings']();
      
      const req = httpMock.expectOne('http://localhost:3000/api/driver/earnings');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle pending requests loading error', () => {
      spyOn(console, 'error');
      
      component['loadPendingRequests']();
      
      const req = httpMock.expectOne('http://localhost:3000/api/driver/ride-requests');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      
      expect(console.error).toHaveBeenCalled();
      expect(component.pendingRequests).toEqual([]);
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      component.currentDriver = mockDriver;
      component.isLoading = false;
      fixture.detectChanges();
    });

    it('should display driver name in header', () => {
      const welcomeText = fixture.nativeElement.querySelector('.welcome-text');
      expect(welcomeText.textContent).toContain('Rajesh Kumar');
    });

    it('should display correct stats', () => {
      component.driverStats = { rating: 4.8, totalRides: 245, monthlyEarnings: 3650.5 };
      fixture.detectChanges();

      const statValues = fixture.nativeElement.querySelectorAll('.stat-value');
      expect(statValues[1].textContent.trim()).toBe('4.8');
      expect(statValues[2].textContent.trim()).toBe('245');
    });

    it('should show loading overlay when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loadingOverlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(loadingOverlay).toBeTruthy();
    });

    it('should show error banner when there is an error', () => {
      component.errorMessage = 'Test error';
      fixture.detectChanges();

      const errorBanner = fixture.nativeElement.querySelector('.error-banner');
      expect(errorBanner).toBeTruthy();
      expect(errorBanner.textContent).toContain('Test error');
    });

    it('should toggle availability switch correctly', () => {
      const toggle = fixture.nativeElement.querySelector('.toggle-switch input');
      expect(toggle.checked).toBe(component.isAvailable);

      component.isAvailable = false;
      fixture.detectChanges();

      expect(toggle.checked).toBe(false);
    });

    it('should display correct tab content', () => {
      // Test Requests tab
      component.setActiveTab('requests');
      fixture.detectChanges();

      let requestsPanel = fixture.nativeElement.querySelector('.requests-panel');
      let currentPanel = fixture.nativeElement.querySelector('.current-ride-panel');

      expect(requestsPanel).toBeTruthy();
      expect(currentPanel).toBeFalsy();

      // Test Current tab
      component.setActiveTab('current');
      fixture.detectChanges();

      requestsPanel = fixture.nativeElement.querySelector('.requests-panel');
      currentPanel = fixture.nativeElement.querySelector('.current-ride-panel');

      expect(requestsPanel).toBeFalsy();
      expect(currentPanel).toBeTruthy();
    });

    it('should show notification badges correctly', () => {
      component.pendingRequests = [{ requestId: '1' } as any, { requestId: '2' } as any];
      component.currentRide = { rideId: 'R001' } as any;
      fixture.detectChanges();

      const countBadge = fixture.nativeElement.querySelector('.count-badge');
      const notificationBadge = fixture.nativeElement.querySelector('.notification-badge');

      expect(countBadge.textContent.trim()).toBe('2');
      expect(notificationBadge).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null current driver gracefully', () => {
      component.currentDriver = null;
      
      expect(() => component['updateDriverStats']()).not.toThrow();
      expect(() => component['initializeForms']()).not.toThrow();
    });

    it('should handle empty ride history', () => {
      component.currentDriver = mockDriver;
      
      component['loadDriverRides']();
      
      const req = httpMock.expectOne('http://localhost:3000/api/driver/1/rides');
      req.flush({ data: [] });
      
      expect(component.rideHistory).toEqual([]);
      expect(component.hasRideHistory).toBeFalsy();
    });

    it('should handle missing rider actions when no current ride', () => {
      component.currentRide = null;
      
      spyOn(window, 'alert');
      
      component.callRider();
      component.messageRider();
      component.startNavigation();
      
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should handle completion when no current ride', () => {
      component.currentRide = null;
      
      spyOn(window, 'confirm');
      
      component.completeRide();
      
      expect(window.confirm).not.toHaveBeenCalled();
      httpMock.expectNone('http://localhost:3000/api/driver/current-ride/complete');
    });
  });
});