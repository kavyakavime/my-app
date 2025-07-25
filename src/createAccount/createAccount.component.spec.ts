import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CreateAccountComponent } from './createAccount.component';
import { of, throwError } from 'rxjs';

describe('CreateAccountComponent', () => {
  let component: CreateAccountComponent;
  let fixture: ComponentFixture<CreateAccountComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, HttpClientTestingModule, CreateAccountComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccountComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Basic Component Tests
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.createAccountForm).toBeDefined();
    expect(component.createAccountForm.get('role')?.value).toBe('rider');
    expect(component.createAccountForm.get('fullName')?.value).toBe('');
    expect(component.createAccountForm.get('email')?.value).toBe('');
    expect(component.isLoading).toBeFalsy();
    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toBe('');
  });

  // Form Validation Tests
  it('should validate required fields', () => {
    const form = component.createAccountForm;
    
    expect(form.valid).toBeFalsy();
    
    // Test required field validations
    expect(form.get('fullName')?.hasError('required')).toBeTruthy();
    expect(form.get('email')?.hasError('required')).toBeTruthy();
    expect(form.get('phoneNumber')?.hasError('required')).toBeTruthy();
    expect(form.get('password')?.hasError('required')).toBeTruthy();
    expect(form.get('confirmPassword')?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.createAccountForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.createAccountForm.get('password');
    
    passwordControl?.setValue('123');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();
    
    passwordControl?.setValue('12345678');
    expect(passwordControl?.hasError('minlength')).toBeFalsy();
  });

  it('should validate phone number pattern', () => {
    const phoneControl = component.createAccountForm.get('phoneNumber');
    
    phoneControl?.setValue('invalid-phone');
    expect(phoneControl?.hasError('pattern')).toBeTruthy();
    
    phoneControl?.setValue('+1234567890');
    expect(phoneControl?.hasError('pattern')).toBeFalsy();
    
    phoneControl?.setValue('(555) 123-4567');
    expect(phoneControl?.hasError('pattern')).toBeFalsy();
  });

  it('should validate password confirmation', () => {
    const form = component.createAccountForm;
    
    form.get('password')?.setValue('password123');
    form.get('confirmPassword')?.setValue('different123');
    
    expect(form.hasError('passwordMismatch')).toBeTruthy();
    expect(form.get('confirmPassword')?.hasError('passwordMismatch')).toBeTruthy();
    
    form.get('confirmPassword')?.setValue('password123');
    expect(form.hasError('passwordMismatch')).toBeFalsy();
    expect(form.get('confirmPassword')?.hasError('passwordMismatch')).toBeFalsy();
  });

  it('should validate full name minimum length', () => {
    const fullNameControl = component.createAccountForm.get('fullName');
    
    fullNameControl?.setValue('A');
    expect(fullNameControl?.hasError('minlength')).toBeTruthy();
    
    fullNameControl?.setValue('John Doe');
    expect(fullNameControl?.hasError('minlength')).toBeFalsy();
  });

  // API Integration Tests
  it('should check if email exists before registration', fakeAsync(() => {
    const testEmail = 'existing@example.com';
    
    // Fill form with valid data
    component.createAccountForm.patchValue({
      fullName: 'John Doe',
      email: testEmail,
      phoneNumber: '+1234567890',
      role: 'rider',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();
    
    // Expect email check request
    const emailCheckReq = httpMock.expectOne(`http://localhost:3000/api/auth/users/email/${testEmail}`);
    expect(emailCheckReq.request.method).toBe('GET');
    
    // Simulate email exists response
    emailCheckReq.flush({ data: { email: testEmail } });
    
    tick();
    
    expect(component.errorMessage).toBe('An account with this email already exists');
    expect(component.isLoading).toBeFalsy();
  }));

  it('should register user successfully when email does not exist', fakeAsync(() => {
    const testData = {
      fullName: 'John Doe',
      email: 'new@example.com',
      phoneNumber: '+1234567890',
      role: 'rider',
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    component.createAccountForm.patchValue(testData);
    component.onSubmit();
    
    // Mock email check (404 - email doesn't exist)
    const emailCheckReq = httpMock.expectOne(`http://localhost:3000/api/auth/users/email/${testData.email}`);
    emailCheckReq.flush(null, { status: 404, statusText: 'Not Found' });
    
    tick();
    
    // Mock successful registration
    const registerReq = httpMock.expectOne('http://localhost:3000/api/auth/register');
    expect(registerReq.request.method).toBe('POST');
    expect(registerReq.request.body).toEqual({
      full_name: 'John Doe',
      email: 'new@example.com',
      phone_number: '+1234567890',
      user_type: 'rider',
      password: 'password123'
    });
    
    registerReq.flush({
      success: true,
      message: 'Account created successfully',
      data: {
        id: 1,
        email: testData.email,
        full_name: testData.fullName,
        user_type: testData.role
      }
    });
    
    tick();
    
    expect(component.successMessage).toBe('Account created successfully! Please check your email for verification.');
    expect(component.isLoading).toBeFalsy();
    
    tick(2000);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin'], {
      queryParams: { 
        message: 'Account created successfully. Please sign in.',
        email: testData.email 
      }
    });
  }));

  it('should handle registration API errors', fakeAsync(() => {
    component.createAccountForm.patchValue({
      fullName: 'John Doe',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      role: 'rider',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();
    
    // Mock email check (404 - email doesn't exist)
    const emailCheckReq = httpMock.expectOne('http://localhost:3000/api/auth/users/email/test@example.com');
    emailCheckReq.flush(null, { status: 404, statusText: 'Not Found' });
    
    tick();
    
    // Mock registration error
    const registerReq = httpMock.expectOne('http://localhost:3000/api/auth/register');
    registerReq.flush(
      { message: 'Server error' }, 
      { status: 500, statusText: 'Internal Server Error' }
    );
    
    tick();
    
    expect(component.errorMessage).toBe('Server error. Please try again later.');
    expect(component.isLoading).toBeFalsy();
  }));

  it('should not submit form when invalid', () => {
    spyOn(component, 'markFormGroupTouched' as any);
    
    component.onSubmit();

    expect(component['markFormGroupTouched']).toHaveBeenCalled();
    expect(component.isLoading).toBeFalsy();
    httpMock.expectNone('http://localhost:3000/api/auth/register');
  });

  it('should not submit when already loading', () => {
    component.isLoading = true;
    component.createAccountForm.patchValue({
      fullName: 'John Doe',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      role: 'rider',
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    component.onSubmit();
    
    httpMock.expectNone('http://localhost:3000/api/auth/users/email/test@example.com');
    httpMock.expectNone('http://localhost:3000/api/auth/register');
  });

  // Error Message Tests
  it('should return correct error messages', () => {
    const form = component.createAccountForm;
    
    // Test required field error
    form.get('fullName')?.markAsTouched();
    expect(component.getErrorMessage('fullName')).toBe('Full Name is required');
    
    // Test email validation error
    form.get('email')?.setValue('invalid-email');
    form.get('email')?.markAsTouched();
    expect(component.getErrorMessage('email')).toBe('Please enter a valid email address');
    
    // Test minimum length error
    form.get('password')?.setValue('123');
    form.get('password')?.markAsTouched();
    expect(component.getErrorMessage('password')).toBe('Password must be at least 8 characters');
    
    // Test pattern error
    form.get('phoneNumber')?.setValue('invalid');
    form.get('phoneNumber')?.markAsTouched();
    expect(component.getErrorMessage('phoneNumber')).toBe('Please enter a valid phone number (e.g., +1234567890)');
    
    // Test password mismatch error
    form.get('password')?.setValue('password123');
    form.get('confirmPassword')?.setValue('different123');
    form.get('confirmPassword')?.markAsTouched();
    expect(component.getErrorMessage('confirmPassword')).toBe('Passwords do not match');
  });

  it('should check if field has error correctly', () => {
    const form = component.createAccountForm;
    
    // Field not touched, should return false even with errors
    expect(component.hasFieldError('fullName')).toBeFalsy();
    
    // Field touched with errors, should return true
    form.get('fullName')?.markAsTouched();
    expect(component.hasFieldError('fullName')).toBeTruthy();
    
    // Field touched without errors, should return false
    form.get('fullName')?.setValue('John Doe');
    expect(component.hasFieldError('fullName')).toBeFalsy();
  });

  it('should mark all fields as touched', () => {
    const form = component.createAccountForm;
    
    component['markFormGroupTouched']();
    
    Object.keys(form.controls).forEach(key => {
      expect(form.get(key)?.touched).toBeTruthy();
    });
  });

  it('should get correct field display names', () => {
    expect(component['getFieldDisplayName']('fullName')).toBe('Full Name');
    expect(component['getFieldDisplayName']('email')).toBe('Email');
    expect(component['getFieldDisplayName']('phoneNumber')).toBe('Phone Number');
    expect(component['getFieldDisplayName']('role')).toBe('Role');
    expect(component['getFieldDisplayName']('password')).toBe('Password');
    expect(component['getFieldDisplayName']('confirmPassword')).toBe('Confirm Password');
    expect(component['getFieldDisplayName']('unknownField')).toBe('unknownField');
  });

  // Navigation Tests
  it('should navigate to sign in page', () => {
    component.navigateToSignIn();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin']);
  });

  // Helper Method Tests
  it('should get field value safely', () => {
    component.createAccountForm.get('fullName')?.setValue('Test Name');
    expect(component.getFieldValue('fullName')).toBe('Test Name');
    expect(component.getFieldValue('nonExistentField')).toBe('');
  });

  it('should check canSubmit property correctly', () => {
    // Invalid form
    expect(component.canSubmit).toBeFalsy();
    
    // Valid form, not loading
    component.createAccountForm.patchValue({
      fullName: 'John Doe',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      role: 'rider',
      password: 'password123',
      confirmPassword: 'password123'
    });
    expect(component.canSubmit).toBeTruthy();
    
    // Valid form but loading
    component.isLoading = true;
    expect(component.canSubmit).toBeFalsy();
  });

  // Message Handling Tests
  it('should clear messages correctly', () => {
    component.errorMessage = 'Test error';
    component.successMessage = 'Test success';
    
    component['clearMessages']();
    
    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toBe('');
  });

  it('should handle registration errors with different status codes', fakeAsync(() => {
    const testCases = [
      { status: 400, expectedMessage: 'Invalid registration data' },
      { status: 409, expectedMessage: 'An account with this email already exists' },
      { status: 500, expectedMessage: 'Server error. Please try again later.' },
      { status: 0, expectedMessage: 'Network error. Please check your connection and try again.' }
    ];

    for (const testCase of testCases) {
      component.createAccountForm.patchValue({
        fullName: 'John Doe',
        email: 'test@example.com',
        phoneNumber: '+1234567890',
        role: 'rider',
        password: 'password123',
        confirmPassword: 'password123'
      });

      component.onSubmit();
      
      // Mock email check
      const emailCheckReq = httpMock.expectOne('http://localhost:3000/api/auth/users/email/test@example.com');
      emailCheckReq.flush(null, { status: 404, statusText: 'Not Found' });
      
      tick();
      
      // Mock registration error
      const registerReq = httpMock.expectOne('http://localhost:3000/api/auth/register');
      registerReq.flush({}, { status: testCase.status, statusText: 'Error' });
      
      tick();
      
      expect(component.errorMessage).toBe(testCase.expectedMessage);
      expect(component.isLoading).toBeFalsy();
      
      component['clearMessages']();
    }
  }));

  // Form Reset Tests
  it('should reset form after successful registration', fakeAsync(() => {
    component.createAccountForm.patchValue({
      fullName: 'John Doe',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      role: 'driver',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();
    
    // Mock email check
    const emailCheckReq = httpMock.expectOne('http://localhost:3000/api/auth/users/email/test@example.com');
    emailCheckReq.flush(null, { status: 404, statusText: 'Not Found' });
    
    tick();
    
    // Mock successful registration
    const registerReq = httpMock.expectOne('http://localhost:3000/api/auth/register');
    registerReq.flush({
      success: true,
      message: 'Account created successfully',
      data: { id: 1, email: 'test@example.com', full_name: 'John Doe', user_type: 'driver' }
    });
    
    tick();
    
    // Check form is reset but role maintains default
    expect(component.createAccountForm.get('fullName')?.value).toBe('');
    expect(component.createAccountForm.get('email')?.value).toBe('');
    expect(component.createAccountForm.get('role')?.value).toBe('rider'); // Default value
  }));
});