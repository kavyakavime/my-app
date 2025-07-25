import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface SignInCredentials {
  email: string;
  password: string;
  userType: string;
}

interface User {
  id: number;
  email: string;
  password_hash: string;
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
  errorMessage = '';
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
    this.clearErrorMessage();
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
    this.clearErrorMessage();
    
    if (this.signInForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const credentials: SignInCredentials = {
        email: this.email?.value,
        password: this.password?.value,
        userType: this.userType?.value
      };

      this.performSignIn(credentials);
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched();
    }
  }

  private async performSignIn(credentials: SignInCredentials): Promise<void> {
    try {
      // Step 1: Fetch user data from database
      const userData = await this.fetchUserData(credentials.email);
      
      if (!userData) {
        this.handleSignInError('User not found');
        return;
      }

      // Step 2: Check if user is active and verified
      if (!userData.is_active || !userData.is_verified) {
        this.handleSignInError('Account is not active or verified');
        return;
      }

      // Step 3: Check if user type matches
      if (userData.user_type !== credentials.userType) {
        this.handleSignInError('Invalid user type selected');
        return;
      }

      // Step 4: Verify password (direct comparison since no hashing)
      const isPasswordValid = await this.verifyPassword(credentials.password, userData.password_hash);
      
      if (isPasswordValid) {
        this.handleSuccessfulSignIn(credentials, userData);
      } else {
        this.handleSignInError('Invalid email or password');
      }
      
    } catch (error) {
      console.error('Authentication error:', error);
      this.handleSignInError('An error occurred during sign in. Please try again.');
    }
  }

  private async fetchUserData(email: string): Promise<User | null> {
    try {
      const response = await this.http.get<ApiResponse>(
        `${this.API_URL}/auth/users/email/${email}`
      ).toPromise();
      
      return response?.data || null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  private async verifyPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
    try {
      // For now, just compare passwords directly (NOT RECOMMENDED FOR PRODUCTION)
      console.log('Comparing passwords directly (no hashing)');
      return plainPassword === storedPassword;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  private handleSuccessfulSignIn(credentials: SignInCredentials, userData: User): void {
    this.isLoading = false;
    
    // Store authentication data
    localStorage.setItem('userType', credentials.userType);
    localStorage.setItem('userEmail', credentials.email);
    localStorage.setItem('userId', userData.id.toString());
    localStorage.setItem('userName', userData.full_name);
    
    // Generate and store a simple session token (in production, use JWT)
    const sessionToken = this.generateSessionToken();
    localStorage.setItem('sessionToken', sessionToken);
    
    console.log('Authentication successful for user:', userData.full_name);
    
    // Navigate based on user type
    if (credentials.userType === 'rider') {
      this.router.navigate(['/rider-dashboard']);
    } else if (credentials.userType === 'driver') {
      //console.log("directing to driver-dashboard");
      //alert("driver daashboard");
      this.router.navigate(['/driver-dashboard']);
    }
  }

  private handleSignInError(message: string = 'Invalid credentials. Please try again.'): void {
    this.isLoading = false;
    this.errorMessage = message;
    this.signInForm.patchValue({ password: '' });
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      this.clearErrorMessage();
    }, 5000);
  }

  private clearErrorMessage(): void {
    this.errorMessage = '';
  }

  private generateSessionToken(): string {
    // Simple session token generation (use JWT in production)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}`;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signInForm.controls).forEach(key => {
      const control = this.signInForm.get(key);
      control?.markAsTouched();
    });
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    console.log('Forgot password clicked');
    this.router.navigate(['/forgot-password']);
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    console.log('Sign up clicked');
    this.router.navigate(['/create-account']);
  }
}