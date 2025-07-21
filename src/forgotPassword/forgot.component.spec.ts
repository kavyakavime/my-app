import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ForgotPasswordComponent } from './forgot.component';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ForgotPasswordComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty email', () => {
    expect(component.forgotPasswordForm).toBeDefined();
    expect(component.forgotPasswordForm.get('email')?.value).toBe('');
    expect(component.isLoading).toBeFalsy();
    expect(component.isSuccessful).toBeFalsy();
  });

  it('should validate required email field', () => {
    const form = component.forgotPasswordForm;
    const emailControl = form.get('email');
    
    expect(form.valid).toBeFalsy();
    expect(emailControl?.hasError('required')).toBeTruthy();
    
    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('required')).toBeFalsy();
  });

  it('should validate email format', () => {
    const emailControl = component.forgotPasswordForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should not submit form when invalid', () => {
    spyOn(component, 'markFormGroupTouched' as any);
    
    component.onSubmit();

    expect(component['markFormGroupTouched']).toHaveBeenCalled();
    expect(component.isLoading).toBeFalsy();
  });

  it('should submit form when valid', fakeAsync(() => {
    const emailValue = 'test@example.com';
    component.forgotPasswordForm.get('email')?.setValue(emailValue);
    
    spyOn(console, 'log');
    
    component.onSubmit();
    
    expect(component.isLoading).toBeTruthy();
    expect(component.isSuccessful).toBeFalsy();
    
    // Fast forward the setTimeout
    tick(2000);
    
    expect(component.isLoading).toBeFalsy();
    expect(component.isSuccessful).toBeTruthy();
    expect(console.log).toHaveBeenCalledWith(`Password reset link sent to: ${emailValue}`);
  }));

  it('should not submit form when already loading', () => {
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    component.isLoading = true;
    
    spyOn(component, 'sendPasswordResetEmail' as any);
    
    component.onSubmit();
    
    expect(component['sendPasswordResetEmail']).not.toHaveBeenCalled();
  });

  it('should return correct error messages', () => {
    const form = component.forgotPasswordForm;
    
    // Test required field error
    form.get('email')?.markAsTouched();
    expect(component.getErrorMessage('email')).toBe('Email address is required');
    
    // Test email validation error
    form.get('email')?.setValue('invalid-email');
    form.get('email')?.markAsTouched();
    expect(component.getErrorMessage('email')).toBe('Please enter a valid email address');
    
    // Test no error when valid
    form.get('email')?.setValue('test@example.com');
    expect(component.getErrorMessage('email')).toBe('');
  });

  it('should check if field has error correctly', () => {
    const form = component.forgotPasswordForm;
    
    // Field not touched, should return false even with errors
    expect(component.hasFieldError('email')).toBeFalsy();
    
    // Field touched with errors, should return true
    form.get('email')?.markAsTouched();
    expect(component.hasFieldError('email')).toBeTruthy();
    
    // Field touched without errors, should return false
    form.get('email')?.setValue('test@example.com');
    expect(component.hasFieldError('email')).toBeFalsy();
  });

  it('should mark all fields as touched', () => {
    const form = component.forgotPasswordForm;
    
    component['markFormGroupTouched']();
    
    Object.keys(form.controls).forEach(key => {
      expect(form.get(key)?.touched).toBeTruthy();
    });
  });

  it('should get correct field display names', () => {
    expect(component['getFieldDisplayName']('email')).toBe('Email address');
    expect(component['getFieldDisplayName']('unknownField')).toBe('unknownField');
  });

  it('should navigate to sign in page', () => {
    component.navigateToSignIn();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should reset form and component state', () => {
    // Set some state
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    component.isLoading = true;
    component.isSuccessful = true;
    
    component.resetForm();
    
    expect(component.forgotPasswordForm.get('email')?.value).toBeNull();
    expect(component.isLoading).toBeFalsy();
    expect(component.isSuccessful).toBeFalsy();
  });

  it('should get email value correctly', () => {
    expect(component.emailValue).toBe('');
    
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    expect(component.emailValue).toBe('test@example.com');
  });

  it('should check if form is valid correctly', () => {
    expect(component.isFormValid).toBeFalsy();
    
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    expect(component.isFormValid).toBeTruthy();
  });

  it('should check if email is empty correctly', () => {
    expect(component.isEmailEmpty).toBeTruthy();
    
    component.forgotPasswordForm.get('email')?.setValue('   ');
    expect(component.isEmailEmpty).toBeTruthy();
    
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    expect(component.isEmailEmpty).toBeFalsy();
  });

  it('should disable submit button when form is invalid', () => {
    const compiled = fixture.nativeElement;
    const submitButton = compiled.querySelector('.submit-button');
    
    expect(submitButton.disabled).toBeTruthy();
    
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    fixture.detectChanges();
    
    expect(submitButton.disabled).toBeFalsy();
  });

  it('should disable submit button when loading', () => {
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    component.isLoading = true;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const submitButton = compiled.querySelector('.submit-button');
    
    expect(submitButton.disabled).toBeTruthy();
  });

  it('should show success message when successful', () => {
    component.isSuccessful = false;
    fixture.detectChanges();
    
    let successMessage = fixture.nativeElement.querySelector('.success-message');
    expect(successMessage).toBeNull();
    
    component.isSuccessful = true;
    fixture.detectChanges();
    
    successMessage = fixture.nativeElement.querySelector('.success-message');
    expect(successMessage).toBeTruthy();
    expect(successMessage.textContent.trim()).toContain('Reset link sent successfully!');
  });

  it('should show loading text when loading', () => {
    component.forgotPasswordForm.get('email')?.setValue('test@example.com');
    component.isLoading = true;
    fixture.detectChanges();
    
    const submitButton = fixture.nativeElement.querySelector('.submit-button');
    expect(submitButton.textContent.trim()).toBe('Sending...');
    
    component.isLoading = false;
    fixture.detectChanges();
    
    expect(submitButton.textContent.trim()).toBe('Send Reset Link');
  });
});