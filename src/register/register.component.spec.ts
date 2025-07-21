import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegisterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the logo and brand name', () => {
    const logoText = compiled.querySelector('.logo-text');
    expect(logoText?.textContent).toContain('liteRide');
  });

  it('should render the main hero title', () => {
    const heroTitle = compiled.querySelector('.hero-title');
    expect(heroTitle?.textContent).toContain('Your Ride is Just');
    expect(heroTitle?.textContent).toContain('One Click Away');
  });

  it('should render the hero subtitle', () => {
    const heroSubtitle = compiled.querySelector('.hero-subtitle');
    expect(heroSubtitle?.textContent).toContain('Fast, reliable, and affordable rides');
  });

  it('should have Book a Ride button', () => {
    const bookRideBtn = compiled.querySelector('.btn.primary');
    expect(bookRideBtn?.textContent?.trim()).toBe('Book a Ride');
  });

  it('should have Create Account button in action buttons', () => {
    const actionButtons = compiled.querySelector('.action-buttons');
    const createAccountBtn = actionButtons?.querySelector('.btn.secondary');
    expect(createAccountBtn?.textContent?.trim()).toBe('Create Account');
  });

  it('should have Become a Driver button', () => {
    const becomeDriverBtn = compiled.querySelector('.btn.outline');
    expect(becomeDriverBtn?.textContent?.trim()).toBe('Become a Driver');
  });

  it('should render all three feature sections', () => {
    const features = compiled.querySelectorAll('.feature');
    expect(features.length).toBe(3);
    
    const featureTitles = Array.from(compiled.querySelectorAll('.feature-title'))
      .map(el => el.textContent?.trim());
    
    expect(featureTitles).toContain('Quick & Easy');
    expect(featureTitles).toContain('Safe & Reliable');
    expect(featureTitles).toContain('Affordable Rates');
  });

  it('should render driver section with correct content', () => {
    const driverTitle = compiled.querySelector('.driver-title');
    const driverSubtitle = compiled.querySelector('.driver-subtitle');
    
    expect(driverTitle?.textContent).toContain('Want to Earn with liteRide?');
    expect(driverSubtitle?.textContent).toContain('Join our driver community');
  });

  it('should render footer with copyright', () => {
    const footer = compiled.querySelector('.footer p');
    expect(footer?.textContent).toContain('© 2024 liteRide. All rights reserved.');
  });

  it('should call onBookRide when Book a Ride button is clicked', () => {
    spyOn(component, 'onBookRide');
    
    const bookRideBtn = compiled.querySelector('.action-buttons .btn.primary') as HTMLButtonElement;
    bookRideBtn.click();
    
    expect(component.onBookRide).toHaveBeenCalled();
  });

  it('should call onCreateAccount when Create Account button is clicked', () => {
    spyOn(component, 'onCreateAccount');
    
    const createAccountBtn = compiled.querySelector('.action-buttons .btn.secondary') as HTMLButtonElement;
    createAccountBtn.click();
    
    expect(component.onCreateAccount).toHaveBeenCalled();
  });

  it('should call onBecomeDriver when Become a Driver button is clicked', () => {
    spyOn(component, 'onBecomeDriver');
    
    const becomeDriverBtn = compiled.querySelector('.btn.outline') as HTMLButtonElement;
    becomeDriverBtn.click();
    
    expect(component.onBecomeDriver).toHaveBeenCalled();
  });

  it('should call onSignIn when Sign In button is clicked', () => {
    spyOn(component, 'onSignIn');
    
    const signInBtn = compiled.querySelector('.nav-button:not(.primary)') as HTMLButtonElement;
    signInBtn.click();
    
    expect(component.onSignIn).toHaveBeenCalled();
  });

  it('should have responsive design classes', () => {
    const container = compiled.querySelector('.container');
    expect(container).toBeTruthy();
    
    const header = compiled.querySelector('.header');
    expect(header).toBeTruthy();
    
    const mainContent = compiled.querySelector('.main-content');
    expect(mainContent).toBeTruthy();
  });

  it('should render feature icons', () => {
    const featureIcons = compiled.querySelectorAll('.feature-icon svg');
    expect(featureIcons.length).toBe(3);
  });

  it('should have proper navigation structure', () => {
    const nav = compiled.querySelector('.nav');
    const navButtons = nav?.querySelectorAll('.nav-button');
    
    expect(navButtons?.length).toBe(2);
    expect(navButtons?.[0].textContent?.trim()).toBe('Sign In');
    expect(navButtons?.[1].textContent?.trim()).toBe('Create Account');
  });
});