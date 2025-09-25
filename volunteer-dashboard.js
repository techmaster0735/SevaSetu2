// Volunteer Dashboard JavaScript
class VolunteerDashboard {
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
        this.showVolunteerSection('overview');
    }

    checkAuth() {
        const user = JSON.parse(localStorage.getItem('sevasetu_user') || '{}');
        
        if (!user.id || user.role !== 'volunteer' || !user.isVerified) {
            window.location.href = 'auth.html';
            return;
        }
        
        this.currentUser = user;
    }

    loadUserData() {
        if (!this.currentUser) return;
        
        // Update user name in various places
        const nameElements = ['userName', 'profileName', 'welcomeName'];
        nameElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = this.currentUser.name || 'Volunteer';
            }
        });
        
        // Load volunteer stats (in real app, this would come from API)
        this.loadVolunteerStats();
    }

    loadVolunteerStats() {
        // Simulate loading stats from API
        const stats = {
            completedTasks: 8,
            pendingTasks: 3,
            totalPoints: 1250,
            volunteerHours: 25,
            projectCount: 3,
            hoursCount: 25
        };
        
        // Update stats in UI
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = stats[key];
            }
        });
        
        // Update badge based on points
        this.updateBadge(stats.totalPoints);
    }

    updateBadge(points) {
        let badge = 'Bronze Badge';
        if (points >= 2000) badge = 'Gold Badge';
        else if (points >= 1000) badge = 'Silver Badge';
        
        const badgeElement = document.getElementById('userBadge');
        if (badgeElement) {
            badgeElement.textContent = `${badge} • ${points} Points`;
        }
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
        
        // Task completion
        document.addEventListener('click', (e) => {
            if (e.target.textContent === 'Mark Complete') {
                this.markTaskComplete(e.target);
            }
        });
        
        // Project application
        document.addEventListener('click', (e) => {
            if (e.target.textContent === 'Apply Now') {
                const projectId = e.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (projectId) {
                    this.applyToProject(projectId);
                }
            }
        });
    }

    showVolunteerSection(section) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(s => s.classList.add('hidden'));
        
        // Show selected section
        const targetSection = document.getElementById(`volunteer-${section}-section`);
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
            case 'browse-projects':
                this.loadAvailableProjects();
                break;
            case 'my-projects':
                this.loadMyProjects();
                break;
            case 'tasks':
                this.loadMyTasks();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
            case 'messages':
                this.loadMessages();
                break;
        }
    }

    loadAvailableProjects() {
        // In real app, this would fetch from API
        console.log('Loading available projects...');
    }

    loadMyProjects() {
        // In real app, this would fetch user's projects from API
        console.log('Loading my projects...');
    }

    loadMyTasks() {
        // In real app, this would fetch user's tasks from API
        console.log('Loading my tasks...');
    }

    loadAchievements() {
        // In real app, this would fetch user's achievements from API
        console.log('Loading achievements...');
    }

    loadMessages() {
        // In real app, this would fetch user's messages from API
        console.log('Loading messages...');
    }

    applyToProject(projectId) {
        // Simulate project application
        const confirmation = confirm('Are you sure you want to apply for this project?');
        
        if (confirmation) {
            // In real app, this would send application to API
            alert('Application submitted successfully! The NGO will review your application and get back to you.');
            
            // Update UI to show application submitted
            const applyButton = event.target;
            applyButton.textContent = 'Application Sent';
            applyButton.disabled = true;
            applyButton.classList.remove('btn-primary');
            applyButton.classList.add('btn-secondary');
        }
    }

    markTaskComplete(button) {
        const taskItem = button.closest('.task-item');
        
        if (taskItem) {
            // Add completed class
            taskItem.classList.add('completed');
            
            // Update button
            button.textContent = 'Completed';
            button.disabled = true;
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            // Add points indicator
            const pointsSpan = document.createElement('div');
            pointsSpan.className = 'task-points';
            pointsSpan.textContent = '+100 points';
            taskItem.querySelector('.task-actions').appendChild(pointsSpan);
            
            // Update stats
            this.updateStatsAfterTaskCompletion();
            
            // Show success message
            this.showNotification('Task completed successfully! +100 points earned.', 'success');
        }
    }

    updateStatsAfterTaskCompletion() {
        // Update completed tasks count
        const completedElement = document.getElementById('completedTasks');
        if (completedElement) {
            const current = parseInt(completedElement.textContent);
            completedElement.textContent = current + 1;
        }
        
        // Update pending tasks count
        const pendingElement = document.getElementById('pendingTasks');
        if (pendingElement) {
            const current = parseInt(pendingElement.textContent);
            if (current > 0) {
                pendingElement.textContent = current - 1;
            }
        }
        
        // Update total points
        const pointsElement = document.getElementById('totalPoints');
        if (pointsElement) {
            const current = parseInt(pointsElement.textContent.replace(',', ''));
            const newPoints = current + 100;
            pointsElement.textContent = newPoints.toLocaleString();
            
            // Update badge if necessary
            this.updateBadge(newPoints);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
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
        alert('Profile management coming soon!');
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
function showVolunteerSection(section) {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.showVolunteerSection(section);
    }
}

function applyToProject(projectId) {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.applyToProject(projectId);
    }
}

function markTaskComplete(button) {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.markTaskComplete(button);
    }
}

function toggleUserMenu() {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.toggleUserMenu();
    }
}

function showProfile() {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.showProfile();
    }
}

function showSettings() {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.showSettings();
    }
}

function logout() {
    if (window.volunteerDashboard) {
        window.volunteerDashboard.logout();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.volunteerDashboard = new VolunteerDashboard();
});