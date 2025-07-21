import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateAccountComponent } from './createAccount.component';

describe('CreateAccountComponent', () => {
  let component: CreateAccountComponent;
  let fixture: ComponentFixture<CreateAccountComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [CreateAccountComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccountComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.createAccountForm).toBeDefined();
    expect(component.createAccountForm.get('role')?.value).toBe('rider');
    expect(component.createAccountForm.get('fullName')?.value).toBe('');
    expect(component.createAccountForm.get('email')?.value).toBe('');
  });

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

  it('should submit form when valid', () => {
    spyOn(window, 'alert');
    
    // Fill form with valid data
    component.createAccountForm.patchValue({
      fullName: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '+1234567890',
      role: 'rider',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();

    expect(window.alert).toHaveBeenCalledWith('Account created successfully!');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should not submit form when invalid', () => {
    spyOn(component, 'markFormGroupTouched' as any);
    
    component.onSubmit();

    expect(component['markFormGroupTouched']).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

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
    expect(component.getErrorMessage('phoneNumber')).toBe('Please enter a valid phone number');
    
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
});