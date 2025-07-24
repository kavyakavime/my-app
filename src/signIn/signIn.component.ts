import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, SignInCredentials } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string;
  user_type: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login: string;
}

interface ApiResponse {
  message: string;
  data: User;
}

@Component({
    selector: 'app-sign-in',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, HttpClientModule], 
    templateUrl: './signIn.component.html',
    styleUrls: ['./signIn.component.scss']
  })
export class SignInComponent implements OnInit {
  signInForm: FormGroup;
  isLoading = false;
  private API_URL = 'http://localhost:3000/api';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
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

  private async performSignIn(credentials: SignInCredentials): Promise<void> {
    try {
      const isAuthenticated = await this.mockAuthentication(credentials);
      this.isLoading = false;
      
      if (isAuthenticated) {
        console.log('Authentication successful');
        this.handleSuccessfulSignIn(credentials);
      } else {
        console.log('Authentication failed');
        this.handleSignInError();
      }
    } catch (error) {
      this.isLoading = false;
      console.error('Authentication error:', error);
      this.handleSignInError();
    }
  }

  private async mockAuthentication(credentials: SignInCredentials): Promise<boolean> {
    try {
      const response = await this.http.get<ApiResponse>(`http://localhost:3000/api/auth/users/email/${credentials.email}`).toPromise();
      const userData: User = response!.data;
      
      console.log('Fetched user data:', userData);
      
      // Check if user exists and credentials match
      if (userData && userData.email === credentials.email) {
        // In a real app, you'd verify the password hash here
        // For now, we'll accept any password for existing users
        return userData.is_active && userData.is_verified;
      }
      
      return false;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    }
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