// Global state management
let currentPage = 'welcome';
let currentDashboardSection = 'overview';
let currentAdminSection = 'overview';

// Back button functionality
function goBack() {
    // Check if there's a previous page in browser history
    if (document.referrer && document.referrer !== window.location.href) {
        window.history.back();
    } else {
        // Fallback to index.html if no referrer
        window.location.href = 'index.html';
    }
}

// Check dashboard access based on user role
function checkDashboardAccess() {
    const user = JSON.parse(localStorage.getItem('sevasetu_user') || '{}');
    
    if (!user.id || !user.isVerified) {
        window.location.href = 'auth.html';
        return;
    }
    
    if (user.role === 'volunteer') {
        window.location.href = 'volunteer-dashboard.html';
    } else if (user.role === 'ngo') {
        if (user.isApproved) {
            window.location.href = 'ngo-dashboard.html';
        } else {
            window.location.href = 'pending-approval.html';
        }
    } else {
        window.location.href = 'auth.html';
    }
}

// Page navigation functions
function showHomepage() {
    document.getElementById('welcome-page').classList.add('hidden');
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    currentPage = 'homepage';
}

function showDashboard() {
    document.getElementById('welcome-page').classList.add('hidden');
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    currentPage = 'dashboard';
    showDashboardSection('overview');
}

function showAdminPanel() {
    document.getElementById('welcome-page').classList.add('hidden');
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    currentPage = 'admin';
    showAdminSection('overview');
}

// Dashboard section navigation
function showDashboardSection(section) {
    // Hide all dashboard sections
    const sections = ['overview', 'tasks', 'projects', 'achievements'];
    sections.forEach(s => {
        const element = document.getElementById(`${s}-section`);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update menu active state
    const menuItems = document.querySelectorAll('.dashboard-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const activeItem = document.querySelector(`.dashboard-menu a[onclick="showDashboardSection('${section}')"]`);
    if (activeItem) {
        activeItem.parentElement.classList.add('active');
    }
    
    currentDashboardSection = section;
}

// Admin section navigation
function showAdminSection(section) {
    // Hide all admin sections
    const sections = ['overview', 'volunteers', 'ngos', 'projects'];
    sections.forEach(s => {
        const element = document.getElementById(`admin-${s}-section`);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show selected section
    const targetSection = document.getElementById(`admin-${section}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update menu active state
    const menuItems = document.querySelectorAll('.admin-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const activeItem = document.querySelector(`.admin-menu a[onclick="showAdminSection('${section}')"]`);
    if (activeItem) {
        activeItem.parentElement.classList.add('active');
    }
    
    currentAdminSection = section;
}

// Modal functions
function showJoinForm() {
    document.getElementById('join-modal').classList.remove('hidden');
}

function showNGOForm() {
    document.getElementById('ngo-modal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Form submission handlers
function handleContactForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // Simulate form submission
    alert(`Thank you ${data.name}! We'll contact you soon at ${data.email}.`);
    event.target.reset();
}

function handleJoinForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // Simulate registration
    alert(`Welcome to SevaSetu! Registration successful for ${data.name}.`);
    closeModal('join-modal');
    event.target.reset();
}

function handleNGOForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // Simulate NGO registration
    alert(`Thank you for registering ${data.organization}! Your application is under review.`);
    closeModal('ngo-modal');
    event.target.reset();
}

// Task management functions
function markTaskComplete(taskElement) {
    taskElement.classList.add('completed');
    const button = taskElement.querySelector('button');
    button.textContent = 'Completed';
    button.disabled = true;
    button.classList.remove('btn-primary');
    button.classList.add('btn-success');
    
    // Add points indicator
    const pointsSpan = document.createElement('span');
    pointsSpan.className = 'task-points';
    pointsSpan.textContent = '+100 points';
    taskElement.appendChild(pointsSpan);
    
    // Update stats (simulate)
    updateDashboardStats();
}

function updateDashboardStats() {
    // Simulate updating dashboard statistics
    const completedTasksElement = document.querySelector('.dashboard-stats .stat-card:first-child h3');
    if (completedTasksElement) {
        const currentCount = parseInt(completedTasksElement.textContent);
        completedTasksElement.textContent = currentCount + 1;
    }
    
    const pointsElement = document.querySelector('.dashboard-stats .stat-card:nth-child(3) h3');
    if (pointsElement) {
        const currentPoints = parseInt(pointsElement.textContent.replace(',', ''));
        pointsElement.textContent = (currentPoints + 100).toLocaleString();
    }
}

// Admin functions
function approveProject(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.textContent = 'Approved';
    statusCell.className = 'status active';
    
    button.textContent = 'Approved';
    button.disabled = true;
    button.classList.remove('btn-success');
    button.classList.add('btn-secondary');
    
    // Hide reject button
    const rejectButton = button.nextElementSibling;
    if (rejectButton) {
        rejectButton.style.display = 'none';
    }
}

function rejectProject(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.textContent = 'Rejected';
    statusCell.className = 'status';
    statusCell.style.background = '#f8d7da';
    statusCell.style.color = '#721c24';
    
    button.textContent = 'Rejected';
    button.disabled = true;
    button.classList.remove('btn-danger');
    button.classList.add('btn-secondary');
    
    // Hide approve button
    const approveButton = button.previousElementSibling;
    if (approveButton) {
        approveButton.style.display = 'none';
    }
}

// Smooth scrolling for navigation links
function smoothScroll(targetId) {
    const target = document.getElementById(targetId);
    if (target) {
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
    
    // Modal form submissions
    const joinModal = document.getElementById('join-modal');
    if (joinModal) {
        const form = joinModal.querySelector('form');
        if (form) {
            form.addEventListener('submit', handleJoinForm);
        }
    }
    
    const ngoModal = document.getElementById('ngo-modal');
    if (ngoModal) {
        const form = ngoModal.querySelector('form');
        if (form) {
            form.addEventListener('submit', handleNGOForm);
        }
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
    });
    
    // Navigation link smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            smoothScroll(targetId);
        });
    });
    
    // Task completion buttons
    document.addEventListener('click', function(event) {
        if (event.target.textContent === 'Mark Complete') {
            event.preventDefault();
            markTaskComplete(event.target.closest('.task-item'));
        }
    });
    
    // Admin action buttons
    document.addEventListener('click', function(event) {
        if (event.target.textContent === 'Approve') {
            event.preventDefault();
            approveProject(event.target);
        } else if (event.target.textContent === 'Reject') {
            event.preventDefault();
            rejectProject(event.target);
        }
    });
    
    // Awareness card interactions
    document.querySelectorAll('.awareness-card .btn').forEach(button => {
        button.addEventListener('click', function() {
            const cardTitle = this.closest('.awareness-card').querySelector('h3').textContent;
            alert(`Thank you for your interest in ${cardTitle}! We'll connect you with relevant opportunities.`);
        });
    });
    
    // Leaderboard interactions
    document.querySelectorAll('.contributor').forEach(contributor => {
        contributor.addEventListener('click', function() {
            const name = this.querySelector('h3').textContent;
            const points = this.querySelector('p').textContent;
            alert(`${name} has earned ${points} through dedicated service to the community!`);
        });
    });
    
    // Stats card animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        });
    }, observerOptions);
    
    // Observe stat cards for animation
    document.querySelectorAll('.stat-card, .awareness-card, .step').forEach(card => {
        observer.observe(card);
    });
    
    // Dynamic greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Welcome';
    
    if (hour < 12) {
        greeting = 'Good Morning';
    } else if (hour < 17) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    
    // Update welcome message if element exists
    const welcomeTitle = document.querySelector('.welcome-page h2');
    if (welcomeTitle && welcomeTitle.textContent.includes('Welcome')) {
        welcomeTitle.textContent = `${greeting}, Welcome to SevaSetu`;
    }
    
    // Simulate real-time updates for dashboard
    if (currentPage === 'dashboard') {
        setInterval(function() {
            // Simulate random activity updates
            const activities = [
                'New volunteer joined your project',
                'Task deadline approaching',
                'Achievement unlocked: Community Helper',
                'New project available in your area'
            ];
            
            // This would normally show notifications
            // For demo purposes, we'll just log them
            if (Math.random() > 0.95) { // 5% chance every interval
                const randomActivity = activities[Math.floor(Math.random() * activities.length)];
                console.log('Dashboard Update:', randomActivity);
            }
        }, 5000);
    }
});

// Utility functions
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatPoints(points) {
    return points.toLocaleString();
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Search functionality (for future enhancement)
function searchProjects(query) {
    // This would implement project search functionality
    console.log('Searching for:', query);
}

function filterByCategory(category) {
    // This would implement category filtering
    console.log('Filtering by category:', category);
}

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showHomepage,
        showDashboard,
        showAdminPanel,
        showDashboardSection,
        showAdminSection,
        showJoinForm,
        showNGOForm,
        closeModal
    };
}