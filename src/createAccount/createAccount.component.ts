import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';


@Component({
    selector: 'app-create-account',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],  
    templateUrl: './createAccount.component.html',
    styleUrls: ['./createAccount.component.scss']
  })

export class CreateAccountComponent implements OnInit {
  createAccountForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
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
  onSubmit(): void {
    if (this.createAccountForm.valid) {
      const formData = this.createAccountForm.value;
      
      // Remove confirmPassword from the data to be sent
      const { confirmPassword, ...accountData } = formData;
      
      //console.log('Creating account with data:', accountData);
      
      // Here you would typically call your authentication service
      // this.authService.createAccount(accountData).subscribe({
      //   next: (response) => {
      //     console.log('Account created successfully', response);
      //     this.router.navigate(['/dashboard']);
      //   },
      //   error: (error) => {
      //     console.error('Error creating account', error);
      //     // Handle error (show toast, etc.)
      //   }
      // });

      // For now, just log and navigate
      //alert('Account created successfully and !');

      this.router.navigate(['/rider-dashboard']);
    } else {
      this.markFormGroupTouched();
    }
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
        return 'Please enter a valid phone number';
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
}