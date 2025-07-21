import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RiderDashboardComponent } from './riderDashboard.component';

describe('RiderDashboardComponent', () => {
  let component: RiderDashboardComponent;
  let fixture: ComponentFixture<RiderDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [RiderDashboardComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RiderDashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.activeTab).toBe('book');
    expect(component.currentUser.name).toBe('Alex');
    expect(component.bookingForm).toBeDefined();
    expect(component.isSearching).toBeFalsy();
    expect(component.isBooking).toBeFalsy();
  });

  it('should initialize booking form with default values', () => {
    const form = component.bookingForm;
    expect(form.get('pickupLocation')?.value).toBe('');
    expect(form.get('destination')?.value).toBe('');
    expect(form.get('rideType')?.value).toBe('car');
    expect(form.get('when')?.value).toBe('now');
  });

  it('should load mock data on init', () => {
    expect(component.availableRides.length).toBe(3);
    expect(component.currentRide).toBeTruthy();
    expect(component.rideHistory.length).toBe(3);
  });

  it('should validate booking form correctly', () => {
    const form = component.bookingForm;
    
    // Form should be invalid initially
    expect(form.valid).toBeFalsy();
    
    // Fill required fields
    form.patchValue({
      pickupLocation: 'Test Pickup',
      destination: 'Test Destination'
    });
    
    expect(form.valid).toBeTruthy();
  });

  it('should switch tabs correctly', () => {
    component.setActiveTab('current');
    expect(component.activeTab).toBe('current');
    
    component.setActiveTab('history');
    expect(component.activeTab).toBe('history');
    
    component.setActiveTab('book');
    expect(component.activeTab).toBe('book');
  });

  it('should not find rides when form is invalid', () => {
    spyOn(component, 'findRides').and.callThrough();
    
    component.findRides();
    
    expect(component.isSearching).toBeFalsy();
  });

  it('should find rides when form is valid', fakeAsync(() => {
    component.bookingForm.patchValue({
      pickupLocation: 'Test Pickup',
      destination: 'Test Destination'
    });
    
    spyOn(console, 'log');
    
    component.findRides();
    
    expect(component.isSearching).toBeTruthy();
    
    tick(2000);
    
    expect(component.isSearching).toBeFalsy();
    expect(console.log).toHaveBeenCalledWith('Rides found:', component.availableRides);
  }));

  it('should not find rides when already searching', () => {
    component.bookingForm.patchValue({
      pickupLocation: 'Test Pickup',
      destination: 'Test Destination'
    });
    component.isSearching = true;
    
    const initialSearching = component.isSearching;
    component.findRides();
    
    expect(component.isSearching).toBe(initialSearching);
  });

  it('should book a ride successfully', fakeAsync(() => {
    const mockRide = component.availableRides[0];
    component.bookingForm.patchValue({
      pickupLocation: 'Test Pickup',
      destination: 'Test Destination'
    });
    
    spyOn(window, 'alert');
    
    component.bookRide(mockRide);
    
    expect(component.isBooking).toBeTruthy();
    
    tick(1500);
    
    expect(component.isBooking).toBeFalsy();
    expect(component.currentRide).toBeTruthy();
    expect(component.currentRide?.driver.name).toBe(mockRide.driverName);
    expect(component.activeTab).toBe('current');
    expect(component.availableRides.length).toBe(0);
    expect(window.alert).toHaveBeenCalledWith('Ride booked successfully!');
  }));

  it('should not book ride when already booking', () => {
    const mockRide = component.availableRides[0];
    component.isBooking = true;
    
    const initialBooking = component.isBooking;
    component.bookRide(mockRide);
    
    expect(component.isBooking).toBe(initialBooking);
  });

  it('should cancel ride with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    
    const initialHistoryLength = component.rideHistory.length;
    component.cancelRide();
    
    expect(component.currentRide).toBeNull();
    expect(component.rideHistory.length).toBe(initialHistoryLength + 1);
    expect(component.rideHistory[0].status).toBe('cancelled');
    expect(window.alert).toHaveBeenCalledWith('Ride cancelled successfully!');
  });

  it('should not cancel ride without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    
    const initialRide = component.currentRide;
    component.cancelRide();
    
    expect(component.currentRide).toBe(initialRide);
  });

  it('should call driver', () => {
    spyOn(window, 'alert');
    
    component.callDriver();
    
    expect(window.alert).toHaveBeenCalledWith(`Calling ${component.currentRide?.driver.name}...`);
  });

  it('should message driver', () => {
    spyOn(window, 'alert');
    
    component.messageDriver();
    
    expect(window.alert).toHaveBeenCalledWith(`Opening chat with ${component.currentRide?.driver.name}...`);
  });

  it('should view ride details', () => {
    const mockRide = component.rideHistory[0];
    spyOn(window, 'alert');
    
    component.viewRideDetails(mockRide);
    
    expect(window.alert).toHaveBeenCalledWith(`Viewing details for ride ${mockRide.rideId}`);
  });

  it('should logout with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(localStorage, 'removeItem');
    
    component.logout();
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('userToken');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should not logout without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn(localStorage, 'removeItem');
    
    component.logout();
    
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should reset booking form', () => {
    component.bookingForm.patchValue({
      pickupLocation: 'Test Pickup',
      destination: 'Test Destination',
      rideType: 'bike'
    });
    component.availableRides = [component.availableRides[0]];
    
    component.resetBookingForm();
    
    expect(component.bookingForm.get('pickupLocation')?.value).toBe('');
    expect(component.bookingForm.get('destination')?.value).toBe('');
    expect(component.bookingForm.get('rideType')?.value).toBe('car');
    expect(component.bookingForm.get('when')?.value).toBe('now');
    expect(component.availableRides.length).toBe(0);
  });

  it('should check if booking form is valid', () => {
    expect(component.isBookingFormValid).toBeFalsy();
    
    component.bookingForm.patchValue({
      pickupLocation: 'Test Pickup',
      destination: 'Test Destination'
    });
    
    expect(component.isBookingFormValid).toBeTruthy();
  });

  it('should get pickup location value', () => {
    const testLocation = 'Test Pickup Location';
    component.bookingForm.get('pickupLocation')?.setValue(testLocation);
    
    expect(component.pickupLocation).toBe(testLocation);
  });

  it('should get destination value', () => {
    const testDestination = 'Test Destination';
    component.bookingForm.get('destination')?.setValue(testDestination);
    
    expect(component.destination).toBe(testDestination);
  });

  it('should check if user has current ride', () => {
    expect(component.hasCurrentRide).toBeTruthy();
    
    component.currentRide = null;
    expect(component.hasCurrentRide).toBeFalsy();
  });

  it('should check if user has ride history', () => {
    expect(component.hasRideHistory).toBeTruthy();
    
    component.rideHistory = [];
    expect(component.hasRideHistory).toBeFalsy();
  });

  it('should format date correctly', () => {
    const testDate = '2024-01-15';
    const formattedDate = component.formatDate(testDate);
    
    expect(formattedDate).toContain('Jan');
    expect(formattedDate).toContain('15');
    expect(formattedDate).toContain('2024');
  });

  it('should handle call driver when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'alert');
    
    component.callDriver();
    
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should handle message driver when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'alert');
    
    component.messageDriver();
    
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should handle cancel ride when no current ride', () => {
    component.currentRide = null;
    spyOn(window, 'confirm');
    
    component.cancelRide();
    
    expect(window.confirm).not.toHaveBeenCalled();
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
});