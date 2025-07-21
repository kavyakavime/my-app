import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RegisterComponent } from '../register/register.component';
import { CreateAccountComponent } from '../createAccount/createAccount.component';

@NgModule({

  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppRoutingModule,
    AppComponent,
    RegisterComponent,  
    CreateAccountComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
