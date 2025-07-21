import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';


export interface SignInCredentials {
  email: string;
  password: string;
  userType: 'rider' | 'driver';
}

@Component({
    selector: 'app-sign-in',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule], // ✅ Add ReactiveFormsModule
    templateUrl: './signIn.component.html',
    styleUrls: ['./signIn.component.scss']
  })
export class SignInComponent implements OnInit {
  signInForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.signInForm = this.createForm();
  }

  ngOnInit(): void {
    // Component initialization logic
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      userType: ['rider', Validators.required]
    });
  }

  // Getter methods for form controls (useful for template validation)
  get email() {
    return this.signInForm.get('email');
  }

  get password() {
    return this.signInForm.get('password');
  }

  get userType() {
    return this.signInForm.get('userType');
  }

  onSubmit(): void {
    if (this.signInForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const credentials: SignInCredentials = {
        email: this.email?.value,
        password: this.password?.value,
        userType: this.userType?.value
      };

      // Simulate API call
      this.performSignIn(credentials);
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched();
    }
  }

  private performSignIn(credentials: SignInCredentials): void {
    // TODO: Replace with actual authentication service call
    console.log('Sign in attempt with:', credentials);
    
    // Simulate API delay
    setTimeout(() => {
      this.isLoading = false;
      
      // TODO: Handle actual authentication logic
      // Example success scenario:
      if (this.mockAuthentication(credentials)) {
        console.log('Authentication successful');
        this.handleSuccessfulSignIn(credentials);
      } else {
        console.log('Authentication failed');
        this.handleSignInError();
      }
    }, 2000);
  }

  private mockAuthentication(credentials: SignInCredentials): boolean {
    // Mock authentication - replace with real service
    return credentials.email === 'test@example.com' && credentials.password === 'password123';
  }

  private handleSuccessfulSignIn(credentials: SignInCredentials): void {
    // TODO: Store authentication token/user data
    localStorage.setItem('userType', credentials.userType);
    localStorage.setItem('userEmail', credentials.email);
    
    // Navigate based on user type
    if (credentials.userType === 'rider') {
      this.router.navigate(['/rider-dashboard']);
    } else {
      this.router.navigate(['/driver-dashboard']);
    }
  }

  private handleSignInError(): void {
    // TODO: Show error message to user
    alert('Invalid credentials. Please try again.');
    this.signInForm.patchValue({ password: '' });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signInForm.controls).forEach(key => {
      const control = this.signInForm.get(key);
      control?.markAsTouched();
    });
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    // TODO: Navigate to forgot password page or show modal
    console.log('Forgot password clicked');
    this.router.navigate(['/forgot-password']);
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    // TODO: Navigate to sign up page
    console.log('Sign up clicked');
    this.router.navigate(['/create-account']);
  }
}