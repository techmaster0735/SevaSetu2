// Authentication System for SevaSetu
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.otpData = null;
        this.otpTimer = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('sevasetu_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        // Initialize event listeners
        this.initEventListeners();
        
        // Show login form by default
        this.showLogin();
    }

    initEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Volunteer registration form
        const volunteerForm = document.getElementById('volunteerRegisterForm');
        if (volunteerForm) {
            volunteerForm.addEventListener('submit', (e) => this.handleVolunteerRegistration(e));
        }

        // NGO registration form
        const ngoForm = document.getElementById('ngoRegisterForm');
        if (ngoForm) {
            ngoForm.addEventListener('submit', (e) => this.handleNGORegistration(e));
        }

        // OTP form
        const otpForm = document.getElementById('otpForm');
        if (otpForm) {
            otpForm.addEventListener('submit', (e) => this.handleOTPVerification(e));
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgotPasswordForm');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }
    }

    // Show different forms
    showLogin() {
        this.hideAllForms();
        document.getElementById('login-form').classList.remove('hidden');
    }

    showRegisterOptions() {
        this.hideAllForms();
        document.getElementById('register-options').classList.remove('hidden');
    }

    showRegisterForm(role) {
        this.hideAllForms();
        if (role === 'volunteer') {
            document.getElementById('volunteer-register-form').classList.remove('hidden');
        } else if (role === 'ngo') {
            document.getElementById('ngo-register-form').classList.remove('hidden');
        }
    }

    showOTPVerification(email) {
        this.hideAllForms();
        document.getElementById('otp-verification-form').classList.remove('hidden');
        document.getElementById('otpEmail').textContent = email;
        this.startOTPTimer();
    }

    showForgotPassword() {
        this.hideAllForms();
        document.getElementById('forgot-password-form').classList.remove('hidden');
    }

    showSuccess(message) {
        this.hideAllForms();
        document.getElementById('success-message').classList.remove('hidden');
        document.getElementById('successText').textContent = message;
    }

    hideAllForms() {
        const forms = [
            'login-form', 'register-options', 'volunteer-register-form', 
            'ngo-register-form', 'otp-verification-form', 'forgot-password-form', 'success-message'
        ];
        forms.forEach(formId => {
            document.getElementById(formId).classList.add('hidden');
        });
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            // Simulate API call
            const user = await this.simulateLogin(email, password);
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('sevasetu_user', JSON.stringify(user));
                this.redirectToDashboard();
            } else {
                this.showError('Invalid email or password');
            }
        } catch (error) {
            this.showError('Login failed. Please try again.');
        }
    }

    // Handle volunteer registration
    async handleVolunteerRegistration(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Validate form
        if (!this.validateVolunteerForm(formData)) {
            return;
        }

        const userData = {
            role: 'volunteer',
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            skills: formData.getAll('skills'),
            availability: formData.get('availability')
        };

        try {
            // Send OTP
            await this.sendOTP(userData.email);
            this.otpData = userData;
            this.showOTPVerification(userData.email);
        } catch (error) {
            this.showError('Registration failed. Please try again.');
        }
    }

    // Handle NGO registration
    async handleNGORegistration(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Validate form
        if (!this.validateNGOForm(formData)) {
            return;
        }

        const userData = {
            role: 'ngo',
            organizationName: formData.get('organizationName'),
            registrationNumber: formData.get('registrationNumber'),
            contactPerson: formData.get('contactPerson'),
            designation: formData.get('designation'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            website: formData.get('website'),
            address: formData.get('address'),
            focusAreas: formData.getAll('focusAreas'),
            description: formData.get('description'),
            password: formData.get('password')
        };

        try {
            // Send OTP
            await this.sendOTP(userData.email);
            this.otpData = userData;
            this.showOTPVerification(userData.email);
        } catch (error) {
            this.showError('Registration failed. Please try again.');
        }
    }

    // Handle OTP verification
    async handleOTPVerification(e) {
        e.preventDefault();
        
        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otp.length !== 6) {
            this.showError('Please enter the complete 6-digit code');
            return;
        }

        try {
            const isValid = await this.verifyOTP(this.otpData.email, otp);
            
            if (isValid) {
                // Complete registration
                await this.completeRegistration(this.otpData);
                this.clearOTPTimer();
                
                const message = this.otpData.role === 'volunteer' 
                    ? 'Welcome to SevaSetu! You can now start volunteering for causes you care about.'
                    : 'Welcome to SevaSetu! Your NGO registration is under review. You will be notified once approved.';
                
                this.showSuccess(message);
            } else {
                this.showError('Invalid OTP. Please try again.');
            }
        } catch (error) {
            this.showError('Verification failed. Please try again.');
        }
    }

    // Handle forgot password
    async handleForgotPassword(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');

        try {
            await this.sendPasswordResetEmail(email);
            this.showSuccess('Password reset link sent to your email');
        } catch (error) {
            this.showError('Failed to send reset link. Please try again.');
        }
    }

    // Validation functions
    validateVolunteerForm(formData) {
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return false;
        }
        
        if (password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return false;
        }
        
        return true;
    }

    validateNGOForm(formData) {
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const focusAreas = formData.getAll('focusAreas');
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return false;
        }
        
        if (password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return false;
        }
        
        if (focusAreas.length === 0) {
            this.showError('Please select at least one focus area');
            return false;
        }
        
        return true;
    }

    // Simulate API calls
    async simulateLogin(email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check stored users
        const users = JSON.parse(localStorage.getItem('sevasetu_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            return {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.role === 'volunteer' 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.organizationName,
                isVerified: user.isVerified,
                isApproved: user.isApproved || user.role === 'volunteer'
            };
        }
        
        return null;
    }

    async sendOTP(email) {
        // Simulate sending OTP
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP (in real app, this would be stored on server)
        localStorage.setItem(`otp_${email}`, JSON.stringify({
            code: otp,
            timestamp: Date.now(),
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        }));
        
        // Simulate email sending
        console.log(`OTP sent to ${email}: ${otp}`);
        alert(`OTP sent to ${email}: ${otp} (This is for demo purposes)`);
        
        return true;
    }

    async verifyOTP(email, otp) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const storedOTP = JSON.parse(localStorage.getItem(`otp_${email}`) || '{}');
        
        if (!storedOTP.code) {
            return false;
        }
        
        if (Date.now() > storedOTP.expires) {
            localStorage.removeItem(`otp_${email}`);
            return false;
        }
        
        if (storedOTP.code === otp) {
            localStorage.removeItem(`otp_${email}`);
            return true;
        }
        
        return false;
    }

    async completeRegistration(userData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get existing users
        const users = JSON.parse(localStorage.getItem('sevasetu_users') || '[]');
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            ...userData,
            isVerified: true,
            isApproved: userData.role === 'volunteer', // Volunteers auto-approved, NGOs need manual approval
            registeredAt: new Date().toISOString()
        };
        
        // Remove password from stored data (in real app, hash it)
        delete newUser.password;
        
        users.push(newUser);
        localStorage.setItem('sevasetu_users', JSON.stringify(users));
        
        // Set current user
        this.currentUser = {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            name: newUser.role === 'volunteer' 
                ? `${newUser.firstName} ${newUser.lastName}` 
                : newUser.organizationName,
            isVerified: newUser.isVerified,
            isApproved: newUser.isApproved
        };
        
        localStorage.setItem('sevasetu_user', JSON.stringify(this.currentUser));
        
        return newUser;
    }

    async sendPasswordResetEmail(email) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In real app, send actual email
        console.log(`Password reset email sent to ${email}`);
        
        return true;
    }

    // OTP Timer functions
    startOTPTimer() {
        let timeLeft = 300; // 5 minutes in seconds
        const timerElement = document.getElementById('otpTimer');
        
        this.otpTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                this.clearOTPTimer();
                this.showError('OTP expired. Please request a new one.');
            }
            
            timeLeft--;
        }, 1000);
    }

    clearOTPTimer() {
        if (this.otpTimer) {
            clearInterval(this.otpTimer);
            this.otpTimer = null;
        }
    }

    // Utility functions
    showError(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            document.querySelector('.auth-form:not(.hidden)').prepend(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.remove();
            }
        }, 5000);
    }

    redirectToDashboard() {
        if (this.currentUser) {
            if (this.currentUser.role === 'volunteer') {
                window.location.href = 'volunteer-dashboard.html';
            } else if (this.currentUser.role === 'ngo') {
                if (this.currentUser.isApproved) {
                    window.location.href = 'ngo-dashboard.html';
                } else {
                    window.location.href = 'pending-approval.html';
                }
            }
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('sevasetu_user');
        window.location.href = 'index.html';
    }

    // Check if user is authenticated and has access
    checkAccess(requiredRole = null) {
        if (!this.currentUser) {
            window.location.href = 'auth.html';
            return false;
        }
        
        if (!this.currentUser.isVerified) {
            window.location.href = 'auth.html';
            return false;
        }
        
        if (requiredRole && this.currentUser.role !== requiredRole) {
            window.location.href = 'unauthorized.html';
            return false;
        }
        
        if (this.currentUser.role === 'ngo' && !this.currentUser.isApproved) {
            window.location.href = 'pending-approval.html';
            return false;
        }
        
        return true;
    }
}

// Global functions for HTML onclick events
function showLogin() {
    authSystem.showLogin();
}

function showRegisterOptions() {
    authSystem.showRegisterOptions();
}

function showRegisterForm(role) {
    authSystem.showRegisterForm(role);
}

function showForgotPassword() {
    authSystem.showForgotPassword();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function moveToNext(current, index) {
    if (current.value.length === 1 && index < 5) {
        const nextInput = document.querySelectorAll('.otp-input')[index + 1];
        nextInput.focus();
    }
}

function resendOTP() {
    if (authSystem.otpData) {
        authSystem.sendOTP(authSystem.otpData.email);
        authSystem.startOTPTimer();
    }
}

function redirectToDashboard() {
    authSystem.redirectToDashboard();
}

// Initialize auth system when page loads
let authSystem;
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}