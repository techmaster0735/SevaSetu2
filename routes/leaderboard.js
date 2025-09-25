const express = require('express');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

const router = express.Router();

// @route   GET /api/leaderboard
// @desc    Get leaderboard data
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      type = 'points', 
      period = 'all-time', 
      limit = 10,
      category 
    } = req.query;

    let dateFilter = {};
    
    // Set date filter based on period
    if (period !== 'all-time') {
      const now = new Date();
      switch (period) {
        case 'weekly':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case 'monthly':
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        case 'yearly':
          dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
      }
    }

    let leaderboard = [];

    if (type === 'points') {
      // Points-based leaderboard
      const query = {
        isActive: true,
        'preferences.privacy.showStats': true,
        'points.total': { $gt: 0 }
      };

      if (period !== 'all-time') {
        query['points.earned.date'] = dateFilter;
      }

      leaderboard = await User.find(query)
        .select('name profile.avatar points.total statistics badges')
        .sort({ 'points.total': -1 })
        .limit(parseInt(limit));

    } else if (type === 'projects') {
      // Projects completed leaderboard
      leaderboard = await User.find({
        isActive: true,
        'preferences.privacy.showStats': true,
        'statistics.projectsCompleted': { $gt: 0 }
      })
      .select('name profile.avatar statistics.projectsCompleted points.total badges')
      .sort({ 'statistics.projectsCompleted': -1 })
      .limit(parseInt(limit));

    } else if (type === 'hours') {
      // Hours volunteered leaderboard
      leaderboard = await User.find({
        isActive: true,
        'preferences.privacy.showStats': true,
        'statistics.hoursVolunteered': { $gt: 0 }
      })
      .select('name profile.avatar statistics.hoursVolunteered points.total badges')
      .sort({ 'statistics.hoursVolunteered': -1 })
      .limit(parseInt(limit));
    }

    // Add rank and badge info
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      avatar: user.profile?.avatar || '',
      points: user.points?.total || 0,
      projectsCompleted: user.statistics?.projectsCompleted || 0,
      hoursVolunteered: user.statistics?.hoursVolunteered || 0,
      currentBadge: user.currentBadge,
      badges: user.badges || []
    }));

    // Get overall statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalProjects = await Project.countDocuments({ status: 'completed' });
    const totalHours = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$statistics.hoursVolunteered' } } }
    ]);

    const stats = {
      totalUsers,
      totalProjects,
      totalHours: totalHours[0]?.total || 0,
      totalPoints: await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$points.total' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        stats,
        filters: {
          type,
          period,
          category
        }
      }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/leaderboard/badges
// @desc    Get badge statistics
// @access  Public
router.get('/badges', async (req, res) => {
  try {
    // Get badge distribution
    const badgeStats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          currentBadge: {
            $cond: {
              if: { $gte: ['$points.total', 2000] },
              then: 'Gold',
              else: {
                $cond: {
                  if: { $gte: ['$points.total', 1000] },
                  then: 'Silver',
                  else: {
                    $cond: {
                      if: { $gte: ['$points.total', 500] },
                      then: 'Bronze',
                      else: 'Newcomer'
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$currentBadge',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get most earned badges
    const popularBadges = await User.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$badges' },
      {
        $group: {
          _id: '$badges.name',
          count: { $sum: 1 },
          description: { $first: '$badges.description' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        badgeDistribution: badgeStats,
        popularBadges
      }
    });

  } catch (error) {
    console.error('Get badge statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/leaderboard/categories
// @desc    Get category-wise leaderboard
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const { category, limit = 5 } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Get users who have worked on projects in this category
    const categoryLeaders = await Project.aggregate([
      {
        $match: {
          category: category,
          status: 'completed'
        }
      },
      { $unwind: '$volunteers' },
      {
        $match: {
          'volunteers.status': 'completed'
        }
      },
      {
        $group: {
          _id: '$volunteers.user',
          projectsCompleted: { $sum: 1 },
          hoursContributed: { $sum: '$volunteers.hoursContributed' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.isActive': true,
          'user.preferences.privacy.showStats': true
        }
      },
      {
        $project: {
          name: '$user.name',
          avatar: '$user.profile.avatar',
          points: '$user.points.total',
          projectsCompleted: 1,
          hoursContributed: 1,
          currentBadge: '$user.currentBadge'
        }
      },
      { $sort: { projectsCompleted: -1, hoursContributed: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Add ranks
    const rankedLeaders = categoryLeaders.map((leader, index) => ({
      ...leader,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        category,
        leaders: rankedLeaders
      }
    });

  } catch (error) {
    console.error('Get category leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/leaderboard/user/:id/rank
// @desc    Get user's rank in leaderboard
// @access  Public
router.get('/user/:id/rank', async (req, res) => {
  try {
    const userId = req.params.id;
    const { type = 'points' } = req.query;

    const user = await User.findById(userId).select('name points.total statistics');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let rank = 0;
    let total = 0;

    if (type === 'points') {
      const higherUsers = await User.countDocuments({
        'points.total': { $gt: user.points.total },
        isActive: true
      });
      rank = higherUsers + 1;
      total = await User.countDocuments({ 
        isActive: true, 
        'points.total': { $gt: 0 } 
      });

    } else if (type === 'projects') {
      const higherUsers = await User.countDocuments({
        'statistics.projectsCompleted': { $gt: user.statistics.projectsCompleted },
        isActive: true
      });
      rank = higherUsers + 1;
      total = await User.countDocuments({ 
        isActive: true, 
        'statistics.projectsCompleted': { $gt: 0 } 
      });

    } else if (type === 'hours') {
      const higherUsers = await User.countDocuments({
        'statistics.hoursVolunteered': { $gt: user.statistics.hoursVolunteered },
        isActive: true
      });
      rank = higherUsers + 1;
      total = await User.countDocuments({ 
        isActive: true, 
        'statistics.hoursVolunteered': { $gt: 0 } 
      });
    }

    const percentile = total > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          points: user.points.total,
          projectsCompleted: user.statistics.projectsCompleted,
          hoursVolunteered: user.statistics.hoursVolunteered
        },
        rank,
        total,
        percentile,
        type
      }
    });

  } catch (error) {
    console.error('Get user rank error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;