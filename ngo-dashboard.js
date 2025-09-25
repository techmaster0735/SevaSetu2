// NGO Dashboard JavaScript
class NGODashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'overview';
        this.init();
    }

    init() {
        // Check authentication and role
        this.checkAuth();
        
        // Load user data
        this.loadUserData();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Show default section
        this.showNGOSection('overview');
    }

    checkAuth() {
        const user = JSON.parse(localStorage.getItem('sevasetu_user') || '{}');
        
        if (!user.id || user.role !== 'ngo' || !user.isVerified) {
            window.location.href = 'auth.html';
            return;
        }
        
        if (!user.isApproved) {
            window.location.href = 'pending-approval.html';
            return;
        }
        
        this.currentUser = user;
    }

    loadUserData() {
        if (!this.currentUser) return;
        
        // Update organization name in various places
        const nameElements = ['ngoName', 'profileOrgName', 'welcomeOrgName'];
        nameElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = this.currentUser.name || 'NGO Organization';
            }
        });
        
        // Load NGO stats (in real app, this would come from API)
        this.loadNGOStats();
    }

    loadNGOStats() {
        // Simulate loading stats from API
        const stats = {
            totalProjects: 5,
            activeVolunteers: 45,
            completedTasks: 128,
            impactNumber: 2500,
            activeProjects: 5,
            totalVolunteers: 45
        };
        
        // Update stats in UI
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = stats[key];
            }
        });
    }

    initEventListeners() {
        // User menu toggle
        const userMenuBtn = document.querySelector('.user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', this.toggleUserMenu);
        }
        
        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                const dropdown = document.querySelector('.user-menu-dropdown');
                if (dropdown) {
                    dropdown.classList.add('hidden');
                }
            }
        });
        
        // Create project form
        const createProjectForm = document.getElementById('createProjectForm');
        if (createProjectForm) {
            createProjectForm.addEventListener('submit', (e) => this.handleCreateProject(e));
        }
        
        // Application approval/rejection
        document.addEventListener('click', (e) => {
            if (e.target.textContent === 'Approve') {
                this.approveApplication(e.target);
            } else if (e.target.textContent === 'Reject') {
                this.rejectApplication(e.target);
            }
        });
    }

    showNGOSection(section) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(s => s.classList.add('hidden'));
        
        // Show selected section
        const targetSection = document.getElementById(`ngo-${section}-section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        // Update menu active state
        const menuItems = document.querySelectorAll('.dashboard-menu li');
        menuItems.forEach(item => item.classList.remove('active'));
        
        const activeItem = document.querySelector(`.dashboard-menu a[onclick*="${section}"]`);
        if (activeItem) {
            activeItem.parentElement.classList.add('active');
        }
        
        this.currentSection = section;
        
        // Load section-specific data
        this.loadSectionData(section);
    }

    loadSectionData(section) {
        switch (section) {
            case 'projects':
                this.loadMyProjects();
                break;
            case 'volunteers':
                this.loadVolunteers();
                break;
            case 'applications':
                this.loadApplications();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'messages':
                this.loadMessages();
                break;
        }
    }

    loadMyProjects() {
        // In real app, this would fetch from API
        console.log('Loading NGO projects...');
    }

    loadVolunteers() {
        // In real app, this would fetch NGO's volunteers from API
        console.log('Loading volunteers...');
    }

    loadApplications() {
        // In real app, this would fetch pending applications from API
        console.log('Loading applications...');
    }

    loadReports() {
        // In real app, this would fetch reports and analytics from API
        console.log('Loading reports...');
    }

    loadMessages() {
        // In real app, this would fetch messages from API
        console.log('Loading messages...');
    }

    handleCreateProject(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const projectData = {
            title: formData.get('title'),
            category: formData.get('category'),
            description: formData.get('description'),
            location: formData.get('location'),
            duration: formData.get('duration'),
            volunteersNeeded: formData.get('volunteersNeeded'),
            beneficiaries: formData.get('beneficiaries'),
            skills: formData.getAll('skills'),
            requirements: formData.get('requirements')
        };
        
        // Validate required fields
        if (!projectData.title || !projectData.category || !projectData.description || 
            !projectData.location || !projectData.duration || !projectData.volunteersNeeded) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }
        
        // Simulate project creation
        this.createProject(projectData);
    }

    createProject(projectData) {
        // In real app, this would send to API
        console.log('Creating project:', projectData);
        
        // Simulate API delay
        setTimeout(() => {
            this.showNotification('Project created successfully! It will be reviewed by our team.', 'success');
            
            // Reset form
            document.getElementById('createProjectForm').reset();
            
            // Switch to projects view
            this.showNGOSection('projects');
        }, 1000);
    }

    approveApplication(button) {
        const applicationItem = button.closest('.application-item');
        const applicantName = applicationItem.querySelector('h4').textContent;
        
        const confirmation = confirm(`Are you sure you want to approve ${applicantName}'s application?`);
        
        if (confirmation) {
            // Update UI
            applicationItem.classList.remove('pending');
            applicationItem.classList.add('approved');
            
            const actionsDiv = applicationItem.querySelector('.application-actions');
            actionsDiv.innerHTML = '<span class="status approved">Approved</span>';
            
            this.showNotification(`${applicantName}'s application has been approved.`, 'success');
            
            // In real app, this would send approval to API
            console.log('Approved application for:', applicantName);
        }
    }

    rejectApplication(button) {
        const applicationItem = button.closest('.application-item');
        const applicantName = applicationItem.querySelector('h4').textContent;
        
        const confirmation = confirm(`Are you sure you want to reject ${applicantName}'s application?`);
        
        if (confirmation) {
            // Update UI
            applicationItem.classList.remove('pending');
            applicationItem.classList.add('rejected');
            
            const actionsDiv = applicationItem.querySelector('.application-actions');
            actionsDiv.innerHTML = '<span class="status rejected">Rejected</span>';
            
            this.showNotification(`${applicantName}'s application has been rejected.`, 'info');
            
            // In real app, this would send rejection to API
            console.log('Rejected application for:', applicantName);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    toggleUserMenu() {
        const dropdown = document.querySelector('.user-menu-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    showProfile() {
        alert('Organization profile management coming soon!');
    }

    showSettings() {
        alert('Settings page coming soon!');
    }

    logout() {
        const confirmation = confirm('Are you sure you want to logout?');
        if (confirmation) {
            localStorage.removeItem('sevasetu_user');
            window.location.href = 'index.html';
        }
    }
}

// Global functions for HTML onclick events
function showNGOSection(section) {
    if (window.ngoDashboard) {
        window.ngoDashboard.showNGOSection(section);
    }
}

function approveApplication(button) {
    if (window.ngoDashboard) {
        window.ngoDashboard.approveApplication(button);
    }
}

function rejectApplication(button) {
    if (window.ngoDashboard) {
        window.ngoDashboard.rejectApplication(button);
    }
}

function toggleUserMenu() {
    if (window.ngoDashboard) {
        window.ngoDashboard.toggleUserMenu();
    }
}

function showProfile() {
    if (window.ngoDashboard) {
        window.ngoDashboard.showProfile();
    }
}

function showSettings() {
    if (window.ngoDashboard) {
        window.ngoDashboard.showSettings();
    }
}

function logout() {
    if (window.ngoDashboard) {
        window.ngoDashboard.logout();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.ngoDashboard = new NGODashboard();
});