import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],  
  templateUrl: './forgot.component.html',
  styleUrls: ['./forgot.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  isSuccessful = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Component initialization logic
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.forgotPasswordForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.isSuccessful = false;

      const email = this.forgotPasswordForm.get('email')?.value;
      
      console.log('Sending password reset for email:', email);
      
      // Simulate API call
      this.sendPasswordResetEmail(email);
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Simulate password reset email sending
   */
  private sendPasswordResetEmail(email: string): void {
    // Here you would typically call your authentication service
    // this.authService.sendPasswordReset(email).subscribe({
    //   next: (response) => {
    //     console.log('Password reset email sent successfully', response);
    //     this.isLoading = false;
    //     this.isSuccessful = true;
    //   },
    //   error: (error) => {
    //     console.error('Error sending password reset email', error);
    //     this.isLoading = false;
    //     // Handle error (show toast, etc.)
    //   }
    // });

    // For demonstration, simulate API delay
    setTimeout(() => {
      this.isLoading = false;
      this.isSuccessful = true;
      console.log(`Password reset link sent to: ${email}`);
    }, 2000);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get validation error message for a specific field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.forgotPasswordForm.get(fieldName);
    
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    
    return '';
  }

  /**
   * Get display name for form fields
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      email: 'Email address'
    };
    
    return displayNames[fieldName] || fieldName;
  }

  /**
   * Check if a specific field has errors and is touched
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.forgotPasswordForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  /**
   * Navigate back to sign in page
   */
  navigateToSignIn(): void {
    this.router.navigate(['/signin']);
  }

  /**
   * Reset form and component state
   */
  resetForm(): void {
    this.forgotPasswordForm.reset();
    this.isLoading = false;
    this.isSuccessful = false;
  }

  /**
   * Get the current email value from the form
   */
  get emailValue(): string {
    return this.forgotPasswordForm.get('email')?.value || '';
  }

  /**
   * Check if the form is valid
   */
  get isFormValid(): boolean {
    return this.forgotPasswordForm.valid;
  }

  /**
   * Check if email field is empty
   */
  get isEmailEmpty(): boolean {
    const email = this.forgotPasswordForm.get('email')?.value;
    return !email || email.trim().length === 0;
  }
}