import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SignInComponent } from './signIn.component';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [SignInComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.signInForm.get('email')?.value).toBe('');
    expect(component.signInForm.get('password')?.value).toBe('');
    expect(component.signInForm.get('userType')?.value).toBe('rider');
  });

  it('should validate required fields', () => {
    component.signInForm.patchValue({
      email: '',
      password: '',
      userType: 'rider'
    });

    expect(component.email?.hasError('required')).toBeTruthy();
    expect(component.password?.hasError('required')).toBeTruthy();
    expect(component.signInForm.invalid).toBeTruthy();
  });

  it('should validate email format', () => {
    component.signInForm.patchValue({
      email: 'invalid-email',
      password: 'password123',
      userType: 'rider'
    });

    expect(component.email?.hasError('email')).toBeTruthy();
    expect(component.signInForm.invalid).toBeTruthy();
  });

  it('should validate password minimum length', () => {
    component.signInForm.patchValue({
      email: 'test@example.com',
      password: '123',
      userType: 'rider'
    });

    expect(component.password?.hasError('minlength')).toBeTruthy();
    expect(component.signInForm.invalid).toBeTruthy();
  });

  it('should be valid with correct inputs', () => {
    component.signInForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      userType: 'rider'
    });

    expect(component.signInForm.valid).toBeTruthy();
  });

  it('should not submit invalid form', () => {
    spyOn(component, 'onSubmit').and.callThrough();
    
    const form = fixture.debugElement.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));

    expect(component.signInForm.invalid).toBeTruthy();
    expect(component.isLoading).toBeFalsy();
  });

  it('should set loading state on valid form submission', () => {
    component.signInForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      userType: 'rider'
    });

    component.onSubmit();

    expect(component.isLoading).toBeTruthy();
  });

  it('should navigate to rider dashboard for rider user type', (done) => {
    component.signInForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      userType: 'rider'
    });

    component.onSubmit();

    // Wait for the setTimeout in performSignIn
    setTimeout(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/rider-dashboard']);
      done();
    }, 2100);
  });

  it('should navigate to driver dashboard for driver user type', (done) => {
    component.signInForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      userType: 'driver'
    });

    component.onSubmit();

    // Wait for the setTimeout in performSignIn
    setTimeout(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/driver-dashboard']);
      done();
    }, 2100);
  });

  it('should navigate to forgot password page', () => {
    const event = new Event('click');
    component.onForgotPassword(event);

    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password']);
  });

  it('should navigate to sign up page', () => {
    const event = new Event('click');
    component.onSignUp(event);

    expect(router.navigate).toHaveBeenCalledWith(['/sign-up']);
  });

  it('should mark form controls as touched when form is invalid on submit', () => {
    component.signInForm.patchValue({
      email: '',
      password: '',
      userType: 'rider'
    });

    component.onSubmit();

    expect(component.email?.touched).toBeTruthy();
    expect(component.password?.touched).toBeTruthy();
  });

  it('should display validation errors when fields are touched and invalid', () => {
    component.signInForm.patchValue({
      email: 'invalid-email',
      password: ''
    });

    component.email?.markAsTouched();
    component.password?.markAsTouched();
    
    fixture.detectChanges();

    const emailError = fixture.debugElement.nativeElement.querySelector('.error-message');
    expect(emailError).toBeTruthy();
  });

  it('should disable submit button when form is invalid', () => {
    component.signInForm.patchValue({
      email: '',
      password: '',
      userType: 'rider'
    });

    fixture.detectChanges();

    const submitButton = fixture.debugElement.nativeElement.querySelector('.sign-in-button');
    expect(submitButton.disabled).toBeTruthy();
  });

  it('should disable submit button when loading', () => {
    component.signInForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      userType: 'rider'
    });

    component.isLoading = true;
    fixture.detectChanges();

    const submitButton = fixture.debugElement.nativeElement.querySelector('.sign-in-button');
    expect(submitButton.disabled).toBeTruthy();
  });
})