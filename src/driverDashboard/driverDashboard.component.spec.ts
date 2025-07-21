import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DriverDashboardComponent } from './driverDashboard.component';

describe('DriverDashboardComponent', () => {
  let component: DriverDashboardComponent;
  let fixture: ComponentFixture<DriverDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [DriverDashboardComponent],
      imports: [ReactiveFormsModule, FormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DriverDashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.activeTab).toBe('requests');
    expect(component.isAvailable).toBeTruthy();
    expect(component.currentDriver.name).toBe('Rajesh Kumar');
    expect(component.isProcessing).toBeFalsy();
  });

  it('should initialize forms with driver data', () => {
    expect(component.profileForm.get('fullName')?.value).toBe('Rajesh Kumar');
    expect(component.profileForm.get('currentLocation')?.value).toBe('Bandra West, Mumbai');
    expect(component.vehicleForm.get('vehicleType')?.value).toBe('Car');
    expect(component.vehicleForm.get('vehicleModel')?.value).toBe('Honda City');
    expect(component.vehicleForm.get('numberPlate')?.value).toBe('MH 01 AB 1234');
  });

  it('should load mock data on init', () => {
    expect(component.pendingRequests.length).toBe(2);
    expect(component.currentRide).toBeTruthy();
    expect(component.rideHistory.length).toBe(3);
    expect(component.earningsSummary.today).toBe(128);
  });

  it('should switch tabs correctly', () => {
    component.setActiveTab('current');
    expect(component.activeTab).toBe('current');
    
    component.setActiveTab('history');
    expect(component.activeTab).toBe('history');
    
    component.setActiveTab('profile');
    expect(component.activeTab).toBe('profile');
    
    component.setActiveTab('requests');
    expect(component.activeTab).toBe('requests');
  });

  it('should toggle availability correctly', () => {
    const initialRequestsCount = component.pendingRequests.length;
    
    // Go offline
    component.isAvailable = false;
    component.toggleAvailability();
    
    expect(component.pendingRequests.length).toBe(0);
    
    // Go online
    component.isAvailable = true;
    component.toggleAvailability();
    
    expect(component.pendingRequests.length).toBeGreaterThan(0);
  });

  it('should accept ride request successfully', fakeAsync(() => {
    const mockRequest = component.pendingRequests[0];
    const initialRequestsCount = component.pendingRequests.length;
    
    spyOn(window, 'alert');
    
    component.acceptRequest(mockRequest);
    
    expect(component.isProcessing).toBeTruthy();
    
    tick(1500);
    
    expect(component.isProcessing).toBeFalsy();
    expect(component.currentRide).toBeTruthy();
    expect(component.currentRide?.rider.name).toBe(mockRequest.riderName);
    expect(component.activeTab).toBe('current');
    expect(component.pendingRequests.length).toBe(initialRequestsCount - 1);
    expect(window.alert).toHaveBeenCalledWith('Ride request accepted successfully!');
  }));

  it('should not accept request when already processing', () => {
    const mockRequest = component.pendingRequests[0];
    component.isProcessing = true;
    
    const initialRequestsCount = component.pendingRequests.length;
    component.acceptRequest(mockRequest);
    
    expect(component.pendingRequests.length).toBe(initialRequestsCount);
  });

  it('should decline ride request successfully', fakeAsync(() => {
    const mockRequest = component.pendingRequests[0];
    const initialRequestsCount = component.pendingRequests.length;
    
    spyOn(window, 'alert');
    
    component.declineRequest(mockRequest);
    
    expect(component.isProcessing).toBeTruthy();
    
    tick(500);
    
    expect(component.isProcessing).toBeFalsy();
    expect(component.pendingRequests.length).toBe(initialRequestsCount - 1);
    expect(window.alert).toHaveBeenCalledWith('Ride request declined.');
  }));

  it('should complete ride with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    
    const initialHistoryLength = component.rideHistory.length;
    const initialTotalRides = component.driverStats.totalRides;
    const currentRideId = component.currentRide?.rideId;
    
    // Ensure we have a current ride for testing
    expect(component.currentRide).toBeTruthy();
    expect(currentRideId).toBeDefined();
    
    component.completeRide();
    
    expect(component.currentRide).toBeNull();
    expect(component.rideHistory.length).toBe(initialHistoryLength + 1);
    if (currentRideId) {
      expect(component.rideHistory[0].rideId).toBe(currentRideId);
    }
    expect(component.driverStats.totalRides).toBe(initialTotalRides + 1);
    expect(window.alert).toHaveBeenCalledWith('Ride completed successfully!');
  });

  it('should not complete ride without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    
    const initialRide = component.currentRide;
    const initialHistoryLength = component.rideHistory.length;
    
    component.completeRide();
    
    expect(component.currentRide).toBe(initialRide);
    expect(component.rideHistory.length).toBe(initialHistoryLength);
  });

  it('should not complete ride when status is not "Rider Picked Up"', () => {
    if (component.currentRide) {
      component.currentRide.status = 'On The Way';
    }
    
    spyOn(window, 'confirm');
    
    component.completeRide();
    
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('should call rider', () => {
    spyOn(window, 'alert');
    
    component.callRider();
    
    expect(window.alert).toHaveBeenCalledWith(`Calling ${component.currentRide?.rider.name}...`);
  });

  it('should message rider', () => {
    spyOn(window, 'alert');
    
    component.messageRider();
    
    expect(window.alert).toHaveBeenCalledWith(`Opening chat with ${component.currentRide?.rider.name}...`);
  });

  it('should start navigation', () => {
    spyOn(window, 'alert');
    
    component.startNavigation();
    
    expect(window.alert).toHaveBeenCalledWith(`Starting navigation to ${component.currentRide?.destination}...`);
  });

  it('should handle emergency', () => {
    spyOn(window, 'alert');
    
    component.emergency();
    
    expect(window.alert).toHaveBeenCalledWith('Emergency services contacted. Stay safe!');
  });

  it('should view ride details', () => {
    const mockRide = component.rideHistory[0];
    spyOn(window, 'alert');
    
    component.viewRideDetails(mockRide);
    
    expect(window.alert).toHaveBeenCalledWith(`Viewing details for ride ${mockRide.rideId}`);
  });

  it('should update location successfully', () => {
    const newLocation = 'Andheri West, Mumbai';
    component.profileForm.get('currentLocation')?.setValue(newLocation);
    
    spyOn(window, 'alert');
    spyOn(console, 'log');
    
    component.updateLocation();
    
    expect(console.log).toHaveBeenCalledWith('Updating location to:', newLocation);
    expect(window.alert).toHaveBeenCalledWith('Location updated successfully!');
  });

  it('should not update location when empty', () => {
    component.profileForm.get('currentLocation')?.setValue('');
    
    spyOn(window, 'alert');
    
    component.updateLocation();
    
    expect(window.alert).toHaveBeenCalledWith('Please enter a valid location.');
  });

  it('should view detailed report', () => {
    spyOn(window, 'alert');
    
    component.viewDetailedReport();
    
    expect(window.alert).toHaveBeenCalledWith('Opening detailed earnings report...');
  });

  it('should logout with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(localStorage, 'removeItem');
    
    component.logout();
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('driverToken');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should not logout without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn(localStorage, 'removeItem');
    
    component.logout();
    
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should check if driver has pending requests', () => {
    expect(component.hasPendingRequests).toBeTruthy();
    
    component.pendingRequests = [];
    expect(component.hasPendingRequests).toBeFalsy();
  });

  it('should check if driver has current ride', () => {
    expect(component.hasCurrentRide).toBeTruthy();
    
    component.currentRide = null;
    expect(component.hasCurrentRide).toBeFalsy();
  });

  it('should check if driver has ride history', () => {
    expect(component.hasRideHistory).toBeTruthy();
    
    component.rideHistory = [];
    expect(component.hasRideHistory).toBeFalsy();
  });

  it('should get current location from form', () => {
    const testLocation = 'Test Location';
    component.profileForm.get('currentLocation')?.setValue(testLocation);
    
    expect(component.currentLocation).toBe(testLocation);
  });

  it('should get availability status text', () => {
    component.isAvailable = true;
    expect(component.availabilityStatus).toBe('Available');
    
    component.isAvailable = false;
    expect(component.availabilityStatus).toBe('Offline');
  });

  it('should format date correctly', () => {
    const testDate = '2024-01-15';
    const formattedDate = component.formatDate(testDate);
    
    expect(formattedDate).toContain('Jan');
    expect(formattedDate).toContain('15');
    expect(formattedDate).toContain('2024');
  });

  it('should clear pending requests', () => {
    component.clearPendingRequests();
    
    expect(component.pendingRequests.length).toBe(0);
  });

  it('should refresh requests when available', () => {
    component.isAvailable = true;
    component.pendingRequests = [];
    
    component.refreshRequests();
    
    expect(component.pendingRequests.length).toBeGreaterThan(0);
  });

  it('should not refresh requests when offline', () => {
    component.isAvailable = false;
    component.pendingRequests = [];
    
    component.refreshRequests();
    
    expect(component.pendingRequests.length).toBe(0);
  });

  it('should handle call rider when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'alert');
    
    component.callRider();
    
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should handle message rider when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'alert');
    
    component.messageRider();
    
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should handle start navigation when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'alert');
    
    component.startNavigation();
    
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should handle complete ride when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'confirm');
    
    component.completeRide();
    
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('should display correct tab content', () => {
    // Test Ride Requests tab
    component.setActiveTab('requests');
    fixture.detectChanges();
    
    let requestsTab = fixture.nativeElement.querySelector('.requests-panel');
    let currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
    let historyTab = fixture.nativeElement.querySelector('.ride-history-panel');
    let profileTab = fixture.nativeElement.querySelector('.profile-panel');
    
    expect(requestsTab).toBeTruthy();
    expect(currentTab).toBeFalsy();
    expect(historyTab).toBeFalsy();
    expect(profileTab).toBeFalsy();
    
    // Test Current Ride tab
    component.setActiveTab('current');
    fixture.detectChanges();
    
    requestsTab = fixture.nativeElement.querySelector('.requests-panel');
    currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
    historyTab = fixture.nativeElement.querySelector('.ride-history-panel');
    profileTab = fixture.nativeElement.querySelector('.profile-panel');
    
    expect(requestsTab).toBeFalsy();
    expect(currentTab).toBeTruthy();
    expect(historyTab).toBeFalsy();
    expect(profileTab).toBeFalsy();
    
    // Test Ride History tab
    component.setActiveTab('history');
    fixture.detectChanges();
    
    requestsTab = fixture.nativeElement.querySelector('.requests-panel');
    currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
    historyTab = fixture.nativeElement.querySelector('.ride-history-panel');
    profileTab = fixture.nativeElement.querySelector('.profile-panel');
    
    expect(requestsTab).toBeFalsy();
    expect(currentTab).toBeFalsy();
    expect(historyTab).toBeTruthy();
    expect(profileTab).toBeFalsy();
    
    // Test Profile tab
    component.setActiveTab('profile');
    fixture.detectChanges();
    
    requestsTab = fixture.nativeElement.querySelector('.requests-panel');
    currentTab = fixture.nativeElement.querySelector('.current-ride-panel');
    historyTab = fixture.nativeElement.querySelector('.ride-history-panel');
    profileTab = fixture.nativeElement.querySelector('.profile-panel');
    
    expect(requestsTab).toBeFalsy();
    expect(currentTab).toBeFalsy();
    expect(historyTab).toBeFalsy();
    expect(profileTab).toBeTruthy();
  });

  it('should update earnings when ride is completed', () => {
    const initialTodayEarnings = component.earningsSummary.today;
    const initialMonthlyEarnings = component.driverStats.monthlyEarnings;
    const rideEarnings = component.currentRide?.fare || 0;
    
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    
    component.completeRide();
    
    expect(component.earningsSummary.today).toBe(initialTodayEarnings + rideEarnings);
    expect(component.driverStats.monthlyEarnings).toBe(initialMonthlyEarnings + rideEarnings);
  });

  it('should generate valid OTP format', () => {
    const otp = component['generateOTP']();
    
    expect(otp).toMatch(/^\d{4}$/);
    expect(parseInt(otp)).toBeGreaterThanOrEqual(1000);
    expect(parseInt(otp)).toBeLessThanOrEqual(9999);
  });

  it('should handle availability toggle properly in template', () => {
    const toggleInput = fixture.nativeElement.querySelector('.toggle-switch input');
    
    expect(toggleInput.checked).toBe(component.isAvailable);
    
    // Simulate toggle
    component.isAvailable = false;
    fixture.detectChanges();
    
    expect(toggleInput.checked).toBe(false);
  });

  it('should display correct availability status in stats', () => {
    const statusBadge = fixture.nativeElement.querySelector('.status-badge');
    
    expect(statusBadge.textContent.trim()).toBe('Available');
    
    component.isAvailable = false;
    fixture.detectChanges();
    
    expect(statusBadge.textContent.trim()).toBe('Offline');
  });
});