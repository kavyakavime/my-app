import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  constructor(private router: Router) {}  

  onBookRide() {
    console.log('Book a Ride clicked');
    this.router.navigate(['/sign-in']);
  }

  onCreateAccount() {
    console.log('Create Account clicked');
    this.router.navigate(['/create-account']);
  }

  onBecomeDriver() {
    console.log('Become a Driver clicked');
    this.router.navigate(['/create-account']);
  }

  onSignIn() {
    console.log('Sign In clicked');
    this.router.navigate(['/sign-in']);  
  }
}