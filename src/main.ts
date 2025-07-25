
  import { bootstrapApplication } from '@angular/platform-browser';
  import { AppComponent } from './app/app.component';
  import { provideRouter } from '@angular/router';
  import { routes } from './app/app-routing.module';
  import { importProvidersFrom } from '@angular/core';
  import { ReactiveFormsModule } from '@angular/forms';
  import { HttpClientModule } from '@angular/common/http';

  
  bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      importProvidersFrom(ReactiveFormsModule), // ✅ Add this
      importProvidersFrom(HttpClientModule), // Make sure this is included
    ],
  }).catch(err => console.error(err));
  
  