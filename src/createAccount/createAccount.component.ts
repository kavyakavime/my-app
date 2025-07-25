import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

interface RegisterResponse {
  message: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
    userType: string;
  };
  error?: string;
}

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],  
  templateUrl: './createAccount.component.html',
  styleUrls: ['./createAccount.component.scss']
})
export class CreateAccountComponent implements OnInit {
  createAccountForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private API_URL = 'http://localhost:3000/api';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.createAccountForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      role: ['rider', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Component initialization logic
    this.clearMessages();
  }

  /**
   * Custom validator to check if passwords match
   */
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password');
    const confirmPassword = formGroup.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword?.hasError('passwordMismatch')) {
      delete confirmPassword.errors?.['passwordMismatch'];
      if (Object.keys(confirmPassword.errors || {}).length === 0) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    this.clearMessages();

    if (this.createAccountForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const formData = this.createAccountForm.value;
      
      // Remove confirmPassword and keep the frontend field names (backend expects these names)
      const accountData: RegisterRequest = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        role: formData.role
      };
      
      try {
        // Check if email already exists
        const emailExists = await this.checkEmailExists(accountData.email);
        if (emailExists) {
          this.handleRegistrationError('An account with this email already exists');
          return;
        }

        // Register the user
        await this.registerUser(accountData);
        
      } catch (error) {
        console.error('Registration error:', error);
        this.handleRegistrationError('An unexpected error occurred. Please try again.');
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Check if email already exists in the database
   */
  private async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await this.http.get(`${this.API_URL}/auth/users/email/${email}`).toPromise();
      console.log('Email check response:', response);
      return !!response; // If we get a response, email exists
    } catch (error: any) {
      console.log('Email check error:', error);
      // If we get a 404, email doesn't exist (which is good)
      if (error.status === 404) {
        console.log('Email does not exist - proceeding with registration');
        return false;
      }
      // For other errors, we'll proceed and let the registration handle it
      console.warn('Error checking email existence:', error);
      return false;
    }
  }

  /**
   * Register the user via API
   */
  private async registerUser(accountData: RegisterRequest): Promise<void> {
    try {
      console.log('Sending registration data:', accountData);
      
      const response = await this.http.post<RegisterResponse>(
        `${this.API_URL}/auth/register`,
        accountData
      ).toPromise();

      console.log('Registration response:', response);

      if (response && response.user) {
        this.handleRegistrationSuccess(response);
      } else {
        console.error('Registration failed:', response);
        this.handleRegistrationError(response?.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration API error:', error);
      console.error('Error status:', error.status);
      console.error('Error body:', error.error);
      
      // Handle specific error responses
      if (error.status === 400) {
        this.handleRegistrationError(error.error?.message || 'Invalid registration data');
      } else if (error.status === 409) {
        this.handleRegistrationError('An account with this email already exists');
      } else if (error.status === 500) {
        this.handleRegistrationError('Server error. Please try again later.');
      } else {
        this.handleRegistrationError('Network error. Please check your connection and try again.');
      }
    }
  }

  /**
   * Handle successful registration
   */
  private handleRegistrationSuccess(response: RegisterResponse): void {
    this.isLoading = false;
    this.successMessage = 'Account created successfully! Please sign-in.';
    
    console.log('Account created successfully:', response.user);

    // Store user information temporarily (until they verify email)
    if (response.user) {
      localStorage.setItem('pendingVerification', JSON.stringify({
        email: response.user.email,
        userType: response.user.userType
      }));
    }

    // Clear the form
    this.createAccountForm.reset({
      role: 'rider' // Reset role to default
    });

    // Navigate to sign-in page after a delay
    setTimeout(() => {
      this.router.navigate(['/sign-in'], {
        queryParams: { 
          message: 'Account created successfully. Please sign in.',
          email: response.user?.email 
        }
      });
    }, 2000);
  }

  /**
   * Handle registration errors
   */
  private handleRegistrationError(message: string): void {
    this.isLoading = false;
    this.errorMessage = message;
    
    // Clear error message after 7 seconds
    setTimeout(() => {
      this.clearMessages();
    }, 7000);
  }

  /**
   * Clear success and error messages
   */
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.createAccountForm.controls).forEach(key => {
      const control = this.createAccountForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get validation error message for a specific field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.createAccountForm.get(fieldName);
    
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['minlength']) {
        const requiredLength = control.errors['minlength'].requiredLength;
        return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters`;
      }
      if (control.errors['pattern']) {
        return 'Please enter a valid phone number (e.g., +1234567890)';
      }
      if (control.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    
    return '';
  }

  /**
   * Get display name for form fields
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      fullName: 'Full Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      role: 'Role',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };
    
    return displayNames[fieldName] || fieldName;
  }

  /**
   * Check if a specific field has errors and is touched
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.createAccountForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  /**
   * Navigate to sign in page
   */
  navigateToSignIn(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.router.navigate(['/sign-in']);
  }

  /**
   * Get field value safely
   */
  getFieldValue(fieldName: string): string {
    return this.createAccountForm.get(fieldName)?.value || '';
  }

  /**
   * Check if form is valid and not loading
   */
  get canSubmit(): boolean {
    return this.createAccountForm.valid && !this.isLoading;
  }
}