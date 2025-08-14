const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createValidation } = require('../middleware/validation');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { AppError } = require('../middleware/errorHandler');

const createGroupSchema = {
    name: {
        required: true,
        minLength: 3,
        maxLength: 50
    },
    description: {
        maxLength: 200
    },
    type: {
        required: true,
        enum: ['travel', 'chat', 'event']
    },
    'travelDetails.destination': {
        required: (body) => body.type === 'travel',
        minLength: 2,
        maxLength: 100
    },
    'travelDetails.startDate': {
        required: (body) => body.type === 'travel',
        custom: (value, body) => {
            if (body.type === 'travel' && new Date(value) < new Date()) {
                return 'Start date must be in the future';
            }
            return null;
        }
    },
    'travelDetails.endDate': {
        required: (body) => body.type === 'travel',
        custom: (value, body) => {
            if (body.type === 'travel' && new Date(value) < new Date(body.travelDetails.startDate)) {
                return 'End date must be after start date';
            }
            return null;
        }
    }
};

router.post('/',
    protect,
    createValidation(createGroupSchema),
    async (req, res, next) => {
        try {
            const { members, ...groupData } = req.body;
            
            const allMembers = Array.from(new Set([
                ...(members || []),
                req.user._id.toString()
            ]));

            const group = await Group.create({
                ...groupData,
                creator: req.user._id,
                members: allMembers.map(memberId => ({
                    user: memberId,
                    role: memberId === req.user._id.toString() ? 'admin' : 'member',
                    status: 'active'
                }))
            });

            await group.populate('members.user', 'name profilePicture');
            await group.populate('creator', 'name profilePicture');

            res.status(201).json({
                status: 'success',
                data: { group }
            });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/', protect, async (req, res, next) => {
    try {
        const groups = await Group.find({
            'members.user': req.user._id,
            'members.status': 'active'
        })
        .populate('members.user', 'name profilePicture')
        .populate('creator', 'name profilePicture')
        .sort({ updatedAt: -1 });

        res.status(200).json({
            status: 'success',
            data: { groups }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('creator', 'name profilePicture')
            .populate('members.user', 'name profilePicture')
            .populate('pendingRequests.user', 'name profilePicture');

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        res.status(200).json({
            status: 'success',
            data: {
                group
            }
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isAdmin(req.user._id)) {
            throw new AppError('Only admins can update group details', 403);
        }

        delete req.body.creator;
        delete req.body.members;
        delete req.body.pendingRequests;

        const updatedGroup = await Group.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate('members.user', 'name profilePicture');

        res.status(200).json({
            status: 'success',
            data: {
                group: updatedGroup
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/join', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (group.isMember(req.user._id)) {
            throw new AppError('You are already a member of this group', 400);
        }

        if (group.settings.joinRequiresApproval) {
            group.pendingRequests.push({
                user: req.user._id,
                status: 'pending'
            });
            await group.save();

            res.status(200).json({
                status: 'success',
                message: 'Join request sent successfully'
            });
        } else {
            await group.addMember(req.user._id);
            
            res.status(200).json({
                status: 'success',
                message: 'Joined group successfully'
            });
        }
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/requests/:userId', protect, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            throw new AppError('Invalid status', 400);
        }

        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isAdmin(req.user._id)) {
            throw new AppError('Only admins can handle join requests', 403);
        }

        const request = group.pendingRequests.find(
            req => req.user.toString() === req.params.userId && req.status === 'pending'
        );

        if (!request) {
            throw new AppError('Join request not found', 404);
        }

        if (status === 'approved') {
            await group.addMember(req.params.userId);
        }

        request.status = status;
        await group.save();

        res.status(200).json({
            status: 'success',
            message: `Join request ${status}`
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id/leave', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isMember(req.user._id)) {
            throw new AppError('You are not a member of this group', 400);
        }

        if (group.creator.toString() === req.user._id.toString()) {
            throw new AppError('Group creator cannot leave. Transfer ownership first.', 400);
        }

        await group.removeMember(req.user._id);

        res.status(200).json({
            status: 'success',
            message: 'Left group successfully'
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/members/:userId/role', protect, async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['admin', 'moderator', 'member'].includes(role)) {
            throw new AppError('Invalid role', 400);
        }

        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isAdmin(req.user._id)) {
            throw new AppError('Only admins can update member roles', 403);
        }

        await group.updateMemberRole(req.params.userId, role);

        res.status(200).json({
            status: 'success',
            message: 'Member role updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (group.creator.toString() !== req.user._id.toString()) {
            throw new AppError('Only group creator can delete the group', 403);
        }

        await Group.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/messages', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) throw new AppError('Group not found', 404);

        if (!group.isMember(req.user._id)) {
            throw new AppError('You must be a member to view messages', 403);
        }

        const messages = await Message.find({ group: group._id })
            .populate('sender', 'name profilePicture')
            .sort('createdAt');

        res.status(200).json({
            status: 'success',
            data: { messages }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/messages', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) throw new AppError('Group not found', 404);

        if (!group.isMember(req.user._id)) {
            throw new AppError('You must be a member to send messages', 403);
        }

        const { content } = req.body;
        if (!content || !content.trim()) {
            throw new AppError('Message content required', 400);
        }

        const message = await Message.create({
            group: group._id,
            sender: req.user._id,
            content: content.trim()
        });

        await message.populate('sender', 'name profilePicture');

        res.status(201).json({
            status: 'success',
            data: { message }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;