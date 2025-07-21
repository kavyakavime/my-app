import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';

import { SignInComponent } from '../signIn/signIn.component'; 
import { RegisterComponent } from '../register/register.component'; 
import { CreateAccountComponent } from '../createAccount/createAccount.component';
import { ForgotPasswordComponent } from '../forgotPassword/forgot.component';
import { RiderDashboardComponent } from '../riderDashboard/riderDashboard.component';
import { DriverDashboardComponent } from '../driverDashboard/driverDashboard.component';


export const routes: Routes = [
  { path: '', component: RegisterComponent }, // when opened, it goes to register
  { path: 'register', component: RegisterComponent },
  { path: 'sign-in', component: SignInComponent },
  { path: 'create-account', component: CreateAccountComponent},
  { path: 'forgot-password', component: ForgotPasswordComponent},
  { path: 'rider-dashboard', component: RiderDashboardComponent},
  { path: 'driver-dashboard', component: DriverDashboardComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }