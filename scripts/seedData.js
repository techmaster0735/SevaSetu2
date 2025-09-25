const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const NGO = require('../models/NGO');
const Project = require('../models/Project');
const Task = require('../models/Task');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sevasetu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await NGO.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@sevasetu.org',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      points: { total: 10000 },
      statistics: {
        projectsCompleted: 50,
        tasksCompleted: 200,
        hoursVolunteered: 500,
        impactScore: 95
      }
    });

    console.log('👤 Created admin user');

    // Create Sample Volunteers
    const volunteers = [];
    const volunteerData = [
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        skills: [
          { name: 'Teaching', level: 'advanced' },
          { name: 'Communication', level: 'expert' }
        ],
        interests: ['education', 'child-welfare'],
        points: { total: 2450 },
        statistics: {
          projectsCompleted: 12,
          tasksCompleted: 45,
          hoursVolunteered: 120,
          impactScore: 88
        }
      },
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        skills: [
          { name: 'Environmental Science', level: 'expert' },
          { name: 'Project Management', level: 'advanced' }
        ],
        interests: ['environment'],
        points: { total: 2100 },
        statistics: {
          projectsCompleted: 10,
          tasksCompleted: 38,
          hoursVolunteered: 95,
          impactScore: 85
        }
      },
      {
        name: 'Anita Desai',
        email: 'anita@example.com',
        skills: [
          { name: 'Healthcare', level: 'intermediate' },
          { name: 'Community Outreach', level: 'advanced' }
        ],
        interests: ['healthcare', 'women-empowerment'],
        points: { total: 1850 },
        statistics: {
          projectsCompleted: 8,
          tasksCompleted: 32,
          hoursVolunteered: 80,
          impactScore: 82
        }
      },
      {
        name: 'Arjun Patel',
        email: 'arjun@example.com',
        skills: [
          { name: 'Technology', level: 'expert' },
          { name: 'Training', level: 'advanced' }
        ],
        interests: ['technology', 'education'],
        points: { total: 1650 },
        statistics: {
          projectsCompleted: 7,
          tasksCompleted: 28,
          hoursVolunteered: 70,
          impactScore: 78
        }
      },
      {
        name: 'Meera Singh',
        email: 'meera@example.com',
        skills: [
          { name: 'Arts & Crafts', level: 'advanced' },
          { name: 'Child Psychology', level: 'intermediate' }
        ],
        interests: ['arts-culture', 'child-welfare'],
        points: { total: 1200 },
        statistics: {
          projectsCompleted: 6,
          tasksCompleted: 22,
          hoursVolunteered: 55,
          impactScore: 75
        }
      }
    ];

    for (const data of volunteerData) {
      const hashedPassword = await bcrypt.hash('volunteer123', 12);
      const volunteer = await User.create({
        ...data,
        password: hashedPassword,
        role: 'volunteer',
        isVerified: true,
        profile: {
          bio: `Passionate volunteer dedicated to making a positive impact in the community.`,
          phone: '+91 98765 43210'
        },
        availability: {
          days: ['saturday', 'sunday'],
          hoursPerWeek: 10
        }
      });
      volunteers.push(volunteer);
    }

    console.log('👥 Created volunteer users');

    // Create Sample NGOs
    const ngos = [];
    const ngoData = [
      {
        name: 'Help India Foundation',
        registrationNumber: 'NGO001',
        email: 'contact@helpindia.org',
        contactPerson: {
          name: 'Dr. Sunita Verma',
          designation: 'Director',
          phone: '+91 98765 12345',
          email: 'sunita@helpindia.org'
        },
        address: {
          street: '123 Gandhi Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001'
        },
        description: 'Help India Foundation is dedicated to improving the lives of underprivileged children through education, healthcare, and skill development programs.',
        mission: 'To create a world where every child has access to quality education and healthcare.',
        focusAreas: ['education', 'healthcare', 'child-welfare'],
        establishedYear: 2010,
        legalStatus: 'registered-society',
        verification: {
          status: 'verified',
          verifiedDate: new Date('2023-01-15')
        },
        rating: { average: 4.5, count: 25 },
        statistics: {
          totalProjects: 15,
          activeProjects: 5,
          completedProjects: 10,
          totalVolunteers: 120,
          totalBeneficiaries: 2500
        }
      },
      {
        name: 'Green Earth NGO',
        registrationNumber: 'NGO002',
        email: 'info@greenearth.org',
        contactPerson: {
          name: 'Ravi Mehta',
          designation: 'Founder',
          phone: '+91 98765 67890',
          email: 'ravi@greenearth.org'
        },
        address: {
          street: '456 Environment Street',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411001'
        },
        description: 'Green Earth NGO focuses on environmental conservation, tree plantation, and creating awareness about climate change.',
        mission: 'To protect and preserve our environment for future generations.',
        focusAreas: ['environment', 'rural-development'],
        establishedYear: 2015,
        legalStatus: 'public-trust',
        verification: {
          status: 'verified',
          verifiedDate: new Date('2023-02-20')
        },
        rating: { average: 4.3, count: 18 },
        statistics: {
          totalProjects: 12,
          activeProjects: 4,
          completedProjects: 8,
          totalVolunteers: 85,
          totalBeneficiaries: 1800
        }
      },
      {
        name: 'Women Empowerment Society',
        registrationNumber: 'NGO003',
        email: 'contact@wes.org',
        contactPerson: {
          name: 'Kavita Sharma',
          designation: 'President',
          phone: '+91 98765 11111',
          email: 'kavita@wes.org'
        },
        address: {
          street: '789 Empowerment Avenue',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001'
        },
        description: 'Women Empowerment Society works towards empowering women through skill development, education, and economic opportunities.',
        mission: 'To create an equal society where women have equal opportunities and rights.',
        focusAreas: ['women-empowerment', 'education', 'poverty'],
        establishedYear: 2012,
        legalStatus: 'registered-society',
        verification: {
          status: 'verified',
          verifiedDate: new Date('2023-03-10')
        },
        rating: { average: 4.7, count: 32 },
        statistics: {
          totalProjects: 18,
          activeProjects: 6,
          completedProjects: 12,
          totalVolunteers: 150,
          totalBeneficiaries: 3200
        }
      }
    ];

    for (const data of ngoData) {
      const ngo = await NGO.create(data);
      ngos.push(ngo);
    }

    console.log('🏢 Created NGO organizations');

    // Create Sample Projects
    const projects = [];
    const projectData = [
      {
        title: 'Digital Literacy Program for Rural Schools',
        description: 'A comprehensive program to introduce digital literacy in rural schools, providing computer training and internet access to students and teachers.',
        shortDescription: 'Bringing digital education to rural communities through computer training and internet access.',
        ngo: ngos[0]._id,
        category: 'education',
        location: {
          address: 'Rural Schools, Raigad District',
          city: 'Raigad',
          state: 'Maharashtra',
          zipCode: '402001'
        },
        timeline: {
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-08-31'),
          milestones: [
            {
              title: 'Setup Computer Labs',
              description: 'Install computers and internet connectivity',
              targetDate: new Date('2024-03-15'),
              status: 'completed',
              completedDate: new Date('2024-03-10')
            },
            {
              title: 'Teacher Training',
              description: 'Train teachers on digital tools',
              targetDate: new Date('2024-04-30'),
              status: 'in-progress'
            }
          ]
        },
        requirements: {
          volunteers: { total: 15, current: 8 },
          skills: [
            { name: 'Computer Skills', level: 'intermediate', required: true },
            { name: 'Teaching', level: 'beginner', required: false }
          ],
          timeCommitment: { hoursPerWeek: 8, totalHours: 120 }
        },
        status: 'active',
        priority: 'high',
        createdBy: admin._id,
        approvedBy: admin._id,
        approvedDate: new Date('2024-01-15'),
        impact: {
          beneficiaries: { direct: 500, indirect: 1500 },
          metrics: [
            { name: 'Students Trained', value: 300, unit: 'students' },
            { name: 'Teachers Trained', value: 25, unit: 'teachers' }
          ]
        },
        tags: ['digital-literacy', 'rural-education', 'technology']
      },
      {
        title: 'Community Tree Plantation Drive',
        description: 'Large-scale tree plantation initiative to increase green cover in urban areas and create awareness about environmental conservation.',
        shortDescription: 'Planting trees to increase urban green cover and environmental awareness.',
        ngo: ngos[1]._id,
        category: 'environment',
        location: {
          address: 'Various locations in Pune',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411001'
        },
        timeline: {
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-06-30'),
          milestones: [
            {
              title: 'Site Preparation',
              description: 'Identify and prepare plantation sites',
              targetDate: new Date('2024-03-15'),
              status: 'completed',
              completedDate: new Date('2024-03-12')
            },
            {
              title: 'Sapling Procurement',
              description: 'Source quality saplings',
              targetDate: new Date('2024-03-25'),
              status: 'completed',
              completedDate: new Date('2024-03-20')
            }
          ]
        },
        requirements: {
          volunteers: { total: 25, current: 18 },
          skills: [
            { name: 'Gardening', level: 'beginner', required: false },
            { name: 'Community Outreach', level: 'intermediate', required: true }
          ],
          timeCommitment: { hoursPerWeek: 6, totalHours: 80 }
        },
        status: 'active',
        priority: 'medium',
        createdBy: admin._id,
        approvedBy: admin._id,
        approvedDate: new Date('2024-02-10'),
        impact: {
          beneficiaries: { direct: 200, indirect: 10000 },
          metrics: [
            { name: 'Trees Planted', value: 2000, unit: 'trees' },
            { name: 'Area Covered', value: 50, unit: 'acres' }
          ]
        },
        tags: ['tree-plantation', 'environment', 'urban-greening'],
        featured: true
      },
      {
        title: 'Women Skill Development Workshop',
        description: 'Comprehensive skill development program for women including tailoring, handicrafts, and entrepreneurship training.',
        shortDescription: 'Empowering women through skill development and entrepreneurship training.',
        ngo: ngos[2]._id,
        category: 'women-empowerment',
        location: {
          address: 'Community Centers, South Delhi',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001'
        },
        timeline: {
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-07-15'),
          milestones: [
            {
              title: 'Workshop Setup',
              description: 'Setup training centers and equipment',
              targetDate: new Date('2024-02-01'),
              status: 'completed',
              completedDate: new Date('2024-01-28')
            },
            {
              title: 'Participant Registration',
              description: 'Register women participants',
              targetDate: new Date('2024-02-15'),
              status: 'completed',
              completedDate: new Date('2024-02-10')
            }
          ]
        },
        requirements: {
          volunteers: { total: 12, current: 9 },
          skills: [
            { name: 'Tailoring', level: 'advanced', required: true },
            { name: 'Business Skills', level: 'intermediate', required: false }
          ],
          timeCommitment: { hoursPerWeek: 10, totalHours: 150 }
        },
        status: 'active',
        priority: 'high',
        createdBy: admin._id,
        approvedBy: admin._id,
        approvedDate: new Date('2024-01-05'),
        impact: {
          beneficiaries: { direct: 100, indirect: 400 },
          metrics: [
            { name: 'Women Trained', value: 80, unit: 'women' },
            { name: 'Skills Taught', value: 5, unit: 'skills' }
          ]
        },
        tags: ['skill-development', 'women-empowerment', 'entrepreneurship']
      }
    ];

    for (const data of projectData) {
      const project = await Project.create(data);
      projects.push(project);
    }

    console.log('📋 Created sample projects');

    // Add volunteers to projects
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const volunteersToAdd = volunteers.slice(0, Math.min(project.requirements.volunteers.current, volunteers.length));
      
      for (const volunteer of volunteersToAdd) {
        project.volunteers.push({
          user: volunteer._id,
          status: 'accepted',
          joinedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
        });
      }
      
      await project.save();
    }

    console.log('🤝 Added volunteers to projects');

    // Create Sample Tasks
    const tasks = [];
    const taskData = [
      {
        title: 'Prepare Computer Lab Setup Plan',
        description: 'Create detailed plan for setting up computer labs in rural schools including hardware requirements and layout.',
        project: projects[0]._id,
        assignedTo: volunteers[0]._id,
        assignedBy: admin._id,
        category: 'planning',
        priority: 'high',
        status: 'completed',
        timeline: {
          startDate: new Date('2024-02-01'),
          dueDate: new Date('2024-02-15'),
          completedDate: new Date('2024-02-12'),
          estimatedHours: 20,
          actualHours: 18
        },
        progress: {
          percentage: 100,
          updates: [
            {
              message: 'Started working on the lab setup plan',
              date: new Date('2024-02-02'),
              updatedBy: volunteers[0]._id
            },
            {
              message: 'Completed hardware requirements analysis',
              date: new Date('2024-02-08'),
              updatedBy: volunteers[0]._id
            },
            {
              message: 'Finalized the complete setup plan',
              date: new Date('2024-02-12'),
              updatedBy: volunteers[0]._id
            }
          ]
        },
        points: { base: 150, bonus: 50, total: 200 }
      },
      {
        title: 'Conduct Teacher Training Session',
        description: 'Organize and conduct training sessions for teachers on using digital tools and computers.',
        project: projects[0]._id,
        assignedTo: volunteers[1]._id,
        assignedBy: admin._id,
        category: 'training',
        priority: 'high',
        status: 'in-progress',
        timeline: {
          startDate: new Date('2024-04-01'),
          dueDate: new Date('2024-04-30'),
          estimatedHours: 40
        },
        progress: {
          percentage: 65,
          updates: [
            {
              message: 'Prepared training materials',
              date: new Date('2024-04-05'),
              updatedBy: volunteers[1]._id
            },
            {
              message: 'Conducted first batch training',
              date: new Date('2024-04-15'),
              updatedBy: volunteers[1]._id
            }
          ]
        },
        points: { base: 200, bonus: 0, total: 200 }
      },
      {
        title: 'Site Survey for Tree Plantation',
        description: 'Survey potential sites for tree plantation and assess soil conditions and space availability.',
        project: projects[1]._id,
        assignedTo: volunteers[2]._id,
        assignedBy: admin._id,
        category: 'fieldwork',
        priority: 'medium',
        status: 'completed',
        timeline: {
          startDate: new Date('2024-03-01'),
          dueDate: new Date('2024-03-10'),
          completedDate: new Date('2024-03-08'),
          estimatedHours: 15,
          actualHours: 12
        },
        progress: {
          percentage: 100,
          updates: [
            {
              message: 'Started site survey in Zone 1',
              date: new Date('2024-03-02'),
              updatedBy: volunteers[2]._id
            },
            {
              message: 'Completed survey of all identified sites',
              date: new Date('2024-03-08'),
              updatedBy: volunteers[2]._id
            }
          ]
        },
        points: { base: 100, bonus: 25, total: 125 }
      }
    ];

    for (const data of taskData) {
      const task = await Task.create(data);
      tasks.push(task);
    }

    console.log('✅ Created sample tasks');

    // Update volunteer statistics and points based on completed tasks
    for (const volunteer of volunteers) {
      const completedTasks = tasks.filter(task => 
        task.assignedTo?.equals(volunteer._id) && task.status === 'completed'
      );
      
      let totalPoints = volunteer.points.total;
      const pointsEarned = [];
      
      for (const task of completedTasks) {
        totalPoints += task.points.total;
        pointsEarned.push({
          amount: task.points.total,
          reason: 'Task completed',
          date: task.timeline.completedDate,
          project: task.project
        });
      }
      
      volunteer.points.total = totalPoints;
      volunteer.points.earned = pointsEarned;
      
      // Add some badges
      volunteer.checkAndAwardBadges();
      
      await volunteer.save();
    }

    console.log('🏆 Updated volunteer points and badges');

    console.log('✨ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👤 Users created: ${volunteers.length + 1} (${volunteers.length} volunteers + 1 admin)`);
    console.log(`🏢 NGOs created: ${ngos.length}`);
    console.log(`📋 Projects created: ${projects.length}`);
    console.log(`✅ Tasks created: ${tasks.length}`);
    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@sevasetu.org / admin123');
    console.log('Volunteers: priya@example.com / volunteer123 (and others)');
    console.log('\n🚀 You can now start the server and explore the application!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seed function
seedData();